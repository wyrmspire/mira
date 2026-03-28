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
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="text-[#4a4a6a] italic animate-pulse">Establishing workspace...</div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-700 max-w-xl mx-auto py-20 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-[#f1f5f9] mb-4">{COPY.completion.heading}</h2>
          <p className="text-[#94a3b8] text-lg leading-relaxed">{COPY.completion.body}</p>
        </div>
        <div className="bg-[#12121a] p-4 rounded-xl border border-[#1e1e2e] text-[#4a4a6a] text-sm font-medium">
          {COPY.completion.returnToChat}
        </div>
      </div>
    );
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
    }
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
          {(currentStep.payload as any)?.knowledge_domain && (
            <KnowledgeCompanion domain={(currentStep.payload as any).knowledge_domain} />
          )}
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

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { KnowledgeUnit } from '@/types/knowledge';
import { COPY } from '@/lib/studio-copy';

interface KnowledgeCompanionProps {
  domain?: string;
  knowledgeUnitId?: string;
}

export function KnowledgeCompanion({ domain, knowledgeUnitId }: KnowledgeCompanionProps) {
  const [units, setUnits] = useState<KnowledgeUnit[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;

    async function fetchKnowledge() {
      setLoading(true);
      try {
        let url = '/api/knowledge';
        if (domain) {
          url += `?domain=${encodeURIComponent(domain)}`;
        } else if (knowledgeUnitId) {
          // If we have a single ID, we still might want to fetch all in that same domain 
          // or just that single unit depending on the instruction.
          // For now, let's stick to domain-based fetching per Lane 5 requirement.
        }
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          // API returns units grouped by domain or flat depending on implementation.
          // Lane 2 W2 says "Groups results by domain in response", so we extract them.
          if (Array.isArray(data)) {
            setUnits(data);
          } else if (data.domains && typeof data.domains === 'object') {
            // If grouped, flatten for this specific domain
            const domainUnits = domain ? data.domains[domain] : Object.values(data.domains).flat();
            setUnits(domainUnits || []);
          } else {
            setUnits([]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch knowledge:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchKnowledge();
  }, [isExpanded, domain, knowledgeUnitId]);

  if (!domain && !knowledgeUnitId) return null;

  return (
    <div className="mt-8 border border-[#1e1e2e] rounded-lg bg-[#0f0f17] overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1e1e2e]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📖</span>
          <span className="text-sm font-medium text-slate-300">
            {COPY.knowledge.actions.learnMore}
          </span>
          {domain && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {domain}
            </span>
          )}
        </div>
        <span className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          ↓
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-[#1e1e2e] bg-[#0c0c12]">
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
            ) : (
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

### components/profile/DirectionSummary.tsx

```tsx
// components/profile/DirectionSummary.tsx
'use client'

import { UserProfile } from '@/types/profile'
import { formatDate } from '@/lib/date'
import { TimePill } from '@/components/common/time-pill'
import { StatusBadge } from '@/components/common/status-badge'

interface DirectionSummaryProps {
  profile: UserProfile
}

export function DirectionSummary({ profile }: DirectionSummaryProps) {
  const hasFacets = profile.facets.length > 0

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
      <div className="col-span-1 p-6 rounded-xl border border-slate-700/50 bg-slate-900/20 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white">{profile.displayName}</h2>
            <p className="text-sm text-slate-400">Member since {formatDate(profile.memberSince)}</p>
          </div>
          <StatusBadge status="active" />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="p-3 bg-white/5 rounded-lg border border-white/5">
            <span className="block text-xl font-bold text-indigo-400">{profile.experienceCount.total}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Total Journeys</span>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/5">
            <span className="block text-xl font-bold text-emerald-400">{profile.experienceCount.completed}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Completed</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {profile.preferredDepth && (
            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Depth: {profile.preferredDepth}
            </span>
          )}
          {profile.preferredMode && (
            <div className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {profile.preferredMode}
            </div>
          )}
        </div>
      </div>

      {/* Interests & Skills Card */}
      <div className="col-span-1 md:col-span-2 p-6 rounded-xl border border-slate-700/50 bg-slate-900/20 space-y-6">
        <div>
          <h3 className="text-xs uppercase tracking-widest font-semibold text-indigo-400 mb-3">Top Interests</h3>
          <div className="flex flex-wrap gap-2">
            {profile.topInterests.length > 0 ? (
              profile.topInterests.map(interest => (
                <span key={interest} className="px-3 py-1 bg-indigo-500/5 text-indigo-300 border border-indigo-500/20 rounded-full text-sm">
                  #{interest}
                </span>
              ))
            ) : (
              <span className="text-slate-600 italic text-sm">No interests captured yet.</span>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-widest font-semibold text-emerald-400 mb-3">Core Skills</h3>
          <div className="flex flex-wrap gap-2">
            {profile.topSkills.length > 0 ? (
              profile.topSkills.map(skill => (
                <span key={skill} className="px-3 py-1 bg-emerald-500/5 text-emerald-300 border border-emerald-500/20 rounded-lg text-sm font-medium">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-slate-600 italic text-sm">No skills identified yet.</span>
            )}
          </div>
        </div>

        {profile.activeGoals.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-widest font-semibold text-amber-400 mb-3">Active Goals</h3>
            <ul className="flex flex-col gap-2">
              {profile.activeGoals.map(goal => (
                <li key={goal} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500/40" />
                  {goal}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
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
  const colorClass = TYPE_COLORS[facet.facet_type] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'

  return (
    <div className={`p-3 rounded-lg border ${colorClass} flex flex-col gap-2 relative overflow-hidden group transition-all hover:bg-opacity-20`}>
      <div className="flex justify-between items-start">
        <span className="text-xs uppercase tracking-widest font-semibold opacity-70">
          {facet.facet_type.replace('_', ' ')}
        </span>
        <span className="text-xs font-mono opacity-50">
          {(facet.confidence * 100).toFixed(0)}%
        </span>
      </div>
      
      <span className="text-lg font-medium leading-tight">
        {facet.value}
      </span>

      {/* Confidence Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 w-full" />
      <div 
        className="absolute bottom-0 left-0 h-1 bg-current transition-all duration-500" 
        style={{ width: `${facet.confidence * 100}%` }} 
      />
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
  { label: COPY.knowledge.heading, href: ROUTES.knowledge, icon: '📚' },
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
  '/icebox': 'On Hold',
  '/shipped': 'Shipped',
  '/killed': 'Removed',
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

import { COPY } from '@/lib/studio-copy'

const NAV_ITEMS = [
  { label: COPY.inbox.heading, href: ROUTES.inbox, icon: '◎' },
  { label: COPY.library.heading, href: ROUTES.library, icon: '◇' },
  { label: COPY.knowledge.heading, href: ROUTES.knowledge, icon: '📚' },
  { label: COPY.experience.timelinePage.heading, href: ROUTES.timeline, icon: '◷' },
  { label: COPY.profilePage.heading, href: ROUTES.profile, icon: '👤' },
  { label: COPY.arena.heading, href: ROUTES.arena, icon: '▶' },
  { label: COPY.icebox.heading, href: ROUTES.icebox, icon: '❄' },
  { label: COPY.shipped.heading, href: ROUTES.shipped, icon: '✦' },
  { label: COPY.killed.heading, href: ROUTES.killed, icon: '†' },
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

### components/timeline/TimelineEventCard.tsx

```tsx
'use client'

import { TimelineEntry } from '@/types/timeline'
import { TimePill } from '@/components/common/time-pill'
import Link from 'next/link'

interface TimelineEventCardProps {
  entry: TimelineEntry
}

const categoryDot: Record<TimelineEntry['category'], string> = {
  experience: 'bg-indigo-500',
  idea: 'bg-amber-500',
  system: 'bg-slate-500',
  github: 'bg-emerald-500',
}

export function TimelineEventCard({ entry }: TimelineEventCardProps) {
  const content = (
    <div className="relative pl-8 pb-8 group">
      {/* Timeline connector line */}
      <div className="absolute left-[7px] top-2 bottom-0 w-px bg-[#1e1e2e]" />
      
      {/* Timeline dot */}
      <div className={`absolute left-0 top-1.5 w-[14px] h-[14px] rounded-full border-2 border-[#09090b] ${categoryDot[entry.category]}`} />
      
      <div className="bg-[#12121a] border border-[#1e1e2e] hover:border-indigo-500/20 rounded-xl p-4 transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${entry.category === 'experience' ? 'text-indigo-400' : 
                entry.category === 'idea' ? 'text-amber-400' : 
                entry.category === 'github' ? 'text-emerald-400' : 'text-slate-400'}`}>
                {entry.category}
              </span>
              <TimePill dateString={entry.timestamp} />
            </div>
            <h3 className="text-sm font-medium text-[#e2e8f0] truncate">
              {entry.title}
            </h3>
            {entry.body && (
              <p className="mt-1 text-xs text-[#94a3b8] leading-relaxed line-clamp-2">
                {entry.body}
              </p>
            )}
          </div>
          
          {entry.actionUrl && (
            <div className="flex-shrink-0 text-xs text-indigo-400 font-medium group-hover:translate-x-1 transition-transform">
              → View
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (entry.actionUrl) {
    return (
      <Link href={entry.actionUrl} className="block group">
        {content}
      </Link>
    )
  }

  return content
}

```

### components/timeline/TimelineFilterBar.tsx

```tsx
'use client'

import { TimelineCategory } from '@/types/timeline'
import { COPY } from '@/lib/studio-copy'

type Filter = 'all' | TimelineCategory

interface TimelineFilterBarProps {
  filter: Filter
  onChange: (filter: Filter) => void
  counts?: {
    all: number
    experience: number
    idea: number
    system: number
    github: number
  }
}

export function TimelineFilterBar({ filter, onChange, counts }: TimelineFilterBarProps) {
  const tabs: { value: Filter; label: string }[] = [
    { value: 'all', label: COPY.experience.timelinePage.filterAll },
    { value: 'experience', label: COPY.experience.timelinePage.filterExperiences },
    { value: 'idea', label: COPY.experience.timelinePage.filterIdeas },
    { value: 'system', label: COPY.experience.timelinePage.filterSystem },
  ]

  return (
    <div className="flex gap-1 p-1 bg-[#12121a] border border-[#1e1e2e] rounded-lg w-fit mb-8">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-3 py-1.5 text-xs rounded transition-colors whitespace-nowrap ${
            filter === tab.value
              ? 'bg-[#1e1e2e] text-[#e2e8f0]'
              : 'text-[#94a3b8] hover:text-[#e2e8f0]'
          }`}
        >
          {tab.label} {counts?.[tab.value as keyof typeof counts] !== undefined && `(${counts[tab.value as keyof typeof counts]})`}
        </button>
      ))}
    </div>
  )
}

```

### lib/adapters/github-adapter.ts

```typescript
/**
 * GitHub Adapter — Provider Boundary
 *
 * Auth strategy:
 * - Phase A (current): Personal Access Token via GITHUB_TOKEN env var
 * - Phase B (future): GitHub App installation token via getGitHubClientForInstallation()
 *
 * All methods in this file use getGitHubClient() which currently resolves from PAT.
 * When migrating to GitHub App, only client.ts needs to change.
 */

import { getGitHubClient } from '@/lib/github/client'
import { getRepoCoordinates, getGitHubConfig } from '@/lib/config/github'

// ---------------------------------------------------------------------------
// Env helpers — delegate to lib/config/github.ts (Lane 1)
// ---------------------------------------------------------------------------

function getOwner(): string {
  return getRepoCoordinates().owner
}

function getRepo(): string {
  return getRepoCoordinates().repo
}

function getDefaultBranch(): string {
  return getGitHubConfig().defaultBranch
}

// ---------------------------------------------------------------------------
// W2 — Connectivity / repo
// ---------------------------------------------------------------------------

export async function validateToken(): Promise<{ valid: boolean; login: string; scopes: string[] }> {
  const octokit = getGitHubClient()
  const response = await octokit.users.getAuthenticated()
  const scopeHeader = (response.headers as Record<string, string | undefined>)['x-oauth-scopes'] ?? ''
  const scopes = scopeHeader
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return { valid: true, login: response.data.login, scopes }
}

export async function getRepoInfo(): Promise<{
  name: string
  full_name: string
  default_branch: string
  private: boolean
}> {
  const octokit = getGitHubClient()
  const { data } = await octokit.repos.get({ owner: getOwner(), repo: getRepo() })
  return {
    name: data.name,
    full_name: data.full_name,
    default_branch: data.default_branch,
    private: data.private,
  }
}

export async function getDefaultBranchName(): Promise<string> {
  const info = await getRepoInfo()
  return info.default_branch
}

// ---------------------------------------------------------------------------
// W3 — Issue methods
// ---------------------------------------------------------------------------

export async function createIssue(params: {
  title: string
  body: string
  labels?: string[]
  assignees?: string[]
}): Promise<{ number: number; url: string }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.issues.create({
    owner: getOwner(),
    repo: getRepo(),
    title: params.title,
    body: params.body,
    labels: params.labels,
    assignees: params.assignees,
  })
  return { number: data.number, url: data.html_url }
}

export async function updateIssue(
  issueNumber: number,
  params: { title?: string; body?: string; state?: 'open' | 'closed' },
): Promise<void> {
  const octokit = getGitHubClient()
  await octokit.issues.update({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
    ...(params.title !== undefined ? { title: params.title } : {}),
    ...(params.body !== undefined ? { body: params.body } : {}),
    ...(params.state !== undefined ? { state: params.state } : {}),
  })
}

export async function addIssueComment(issueNumber: number, body: string): Promise<{ id: number }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.issues.createComment({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
    body,
  })
  return { id: data.id }
}

export async function addIssueLabels(issueNumber: number, labels: string[]): Promise<void> {
  const octokit = getGitHubClient()
  await octokit.issues.addLabels({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
    labels,
  })
}

export async function closeIssue(issueNumber: number): Promise<void> {
  await updateIssue(issueNumber, { state: 'closed' })
}

// ---------------------------------------------------------------------------
// W4 — Pull request methods
// ---------------------------------------------------------------------------

export async function createBranch(
  branchName: string,
  fromSha?: string,
): Promise<{ ref: string }> {
  const octokit = getGitHubClient()
  let sha = fromSha
  if (!sha) {
    // Get the SHA of the default branch head
    const { data: ref } = await octokit.git.getRef({
      owner: getOwner(),
      repo: getRepo(),
      ref: `heads/${getDefaultBranch()}`,
    })
    sha = ref.object.sha
  }
  const { data } = await octokit.git.createRef({
    owner: getOwner(),
    repo: getRepo(),
    ref: `refs/heads/${branchName}`,
    sha,
  })
  return { ref: data.ref }
}

export async function createPullRequest(params: {
  title: string
  body: string
  head: string
  base?: string
  draft?: boolean
}): Promise<{ number: number; url: string }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.create({
    owner: getOwner(),
    repo: getRepo(),
    title: params.title,
    body: params.body,
    head: params.head,
    base: params.base ?? getDefaultBranch(),
    draft: params.draft ?? false,
  })
  return { number: data.number, url: data.html_url }
}

export async function getPullRequest(prNumber: number): Promise<{
  number: number
  title: string
  url: string
  state: string
  head: { sha: string; ref: string }
  base: { ref: string }
  draft: boolean
  mergeable: boolean | null
  merged: boolean
}> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.get({
    owner: getOwner(),
    repo: getRepo(),
    pull_number: prNumber,
  })
  return {
    number: data.number,
    title: data.title,
    url: data.html_url,
    state: data.state,
    head: { sha: data.head.sha, ref: data.head.ref },
    base: { ref: data.base.ref },
    draft: data.draft ?? false,
    mergeable: data.mergeable ?? null,
    merged: data.merged,
  }
}

export async function listPullRequestsForRepo(params?: {
  state?: 'open' | 'closed' | 'all'
}): Promise<Array<{ number: number; title: string; url: string; state: string }>> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.list({
    owner: getOwner(),
    repo: getRepo(),
    state: params?.state ?? 'open',
  })
  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    state: pr.state,
  }))
}

export async function addPullRequestComment(
  prNumber: number,
  body: string,
): Promise<{ id: number }> {
  // PR comments use the issues API
  return addIssueComment(prNumber, body)
}

export async function mergePullRequest(
  prNumber: number,
  params?: { merge_method?: 'merge' | 'squash' | 'rebase'; commit_title?: string },
): Promise<{ sha: string; merged: boolean }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.merge({
    owner: getOwner(),
    repo: getRepo(),
    pull_number: prNumber,
    merge_method: params?.merge_method ?? 'squash',
    commit_title: params?.commit_title,
  })
  return { sha: data.sha ?? '', merged: data.merged }
}

// ---------------------------------------------------------------------------
// W5 — Workflow / Actions methods
// ---------------------------------------------------------------------------

export async function dispatchWorkflow(params: {
  workflowId: string
  ref?: string
  inputs?: Record<string, string>
}): Promise<void> {
  const octokit = getGitHubClient()
  await octokit.actions.createWorkflowDispatch({
    owner: getOwner(),
    repo: getRepo(),
    workflow_id: params.workflowId,
    ref: params.ref ?? getDefaultBranch(),
    inputs: params.inputs ?? {},
  })
}

export async function getWorkflowRun(runId: number): Promise<{
  id: number
  name: string | null
  status: string | null
  conclusion: string | null
  url: string
  headSha: string
}> {
  const octokit = getGitHubClient()
  const { data } = await octokit.actions.getWorkflowRun({
    owner: getOwner(),
    repo: getRepo(),
    run_id: runId,
  })
  return {
    id: data.id,
    name: data.name ?? null,
    status: data.status ?? null,
    conclusion: data.conclusion ?? null,
    url: data.html_url,
    headSha: data.head_sha,
  }
}

export async function listWorkflowRuns(params?: {
  workflowId?: string
  status?: string
  perPage?: number
}): Promise<
  Array<{
    id: number
    name: string | null
    status: string | null
    conclusion: string | null
    url: string
  }>
> {
  const octokit = getGitHubClient()

  if (params?.workflowId) {
    const { data } = await octokit.actions.listWorkflowRuns({
      owner: getOwner(),
      repo: getRepo(),
      workflow_id: params.workflowId,
      per_page: params.perPage ?? 10,
    })
    return data.workflow_runs.map((run) => ({
      id: run.id,
      name: run.name ?? null,
      status: run.status ?? null,
      conclusion: run.conclusion ?? null,
      url: run.html_url,
    }))
  }

  const { data } = await octokit.actions.listWorkflowRunsForRepo({
    owner: getOwner(),
    repo: getRepo(),
    per_page: params?.perPage ?? 10,
  })
  return data.workflow_runs.map((run) => ({
    id: run.id,
    name: run.name ?? null,
    status: run.status ?? null,
    conclusion: run.conclusion ?? null,
    url: run.html_url,
  }))
}

// ---------------------------------------------------------------------------
// W6 — Copilot handoff
// ---------------------------------------------------------------------------

/** Stable GraphQL node ID for the Copilot bot account. */
const COPILOT_BOT_NODE_ID = 'BOT_kgDOC9w8XQ'

/**
 * Get the GraphQL node ID for an issue (needed for GraphQL mutations).
 */
export async function getIssueNodeId(issueNumber: number): Promise<string> {
  const octokit = getGitHubClient()
  const { data } = await octokit.issues.get({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
  })
  return data.node_id
}

/**
 * Assign Copilot coding agent via GraphQL with model selection.
 *
 * Uses the `addAssigneesToAssignable` mutation with `agentAssignment`
 * and the required `GraphQL-Features: issues_copilot_assignment_api_support` header.
 *
 * This is the most reliable way to trigger Copilot with a specific model.
 */
export async function assignCopilotViaGraphQL(params: {
  issueNodeId: string
  model?: string
  customInstructions?: string
  baseRef?: string
}): Promise<{ success: boolean; assignees: string[] }> {
  const config = getGitHubConfig()
  const token = config.token

  const query = `
    mutation($input: AddAssigneesToAssignableInput!) {
      addAssigneesToAssignable(input: $input) {
        assignable {
          ... on Issue {
            number
            assignees(first: 5) { nodes { login } }
          }
        }
      }
    }
  `

  const agentAssignment: Record<string, string> = {}
  if (params.model) agentAssignment.customAgent = params.model
  if (params.customInstructions) agentAssignment.customInstructions = params.customInstructions
  if (params.baseRef) agentAssignment.baseRef = params.baseRef

  const variables = {
    input: {
      assignableId: params.issueNodeId,
      assigneeIds: [COPILOT_BOT_NODE_ID],
      ...(Object.keys(agentAssignment).length > 0 ? { agentAssignment } : {}),
    },
  }

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'GraphQL-Features': 'issues_copilot_assignment_api_support',
    },
    body: JSON.stringify({ query, variables }),
  })

  const data = await res.json()

  if (data.errors) {
    const msg = data.errors[0]?.message ?? 'Unknown GraphQL error'
    throw new Error(`[github-adapter] assignCopilotViaGraphQL failed: ${msg}`)
  }

  const nodes = data.data.addAssigneesToAssignable.assignable.assignees.nodes
  return {
    success: true,
    assignees: nodes.map((n: { login: string }) => n.login),
  }
}

/**
 * Trigger Copilot via PR-comment — the most reliable method.
 *
 * Flow:
 * 1. Create branch `copilot/issue-<num>` from default branch
 * 2. Create a draft PR linking to the issue
 * 3. Post `@copilot` comment with task instructions
 *
 * This bypasses PAT/OAuth issues because @copilot mentions on PRs
 * route through a different, more reliable product surface.
 */
export async function triggerCopilotViaPR(params: {
  issueNumber: number
  issueTitle: string
  issueBody: string
  model?: string
  customInstructions?: string
}): Promise<{ prNumber: number; prUrl: string; branchName: string }> {
  const octokit = getGitHubClient()
  const owner = getOwner()
  const repo = getRepo()
  const branchName = `copilot/issue-${params.issueNumber}`

  // Step 1: Create branch from default branch
  const { data: mainRef } = await octokit.git.getRef({
    owner, repo, ref: `heads/${getDefaultBranch()}`,
  })
  const baseSha = mainRef.object.sha

  await octokit.git.createRef({
    owner, repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  })

  // Step 2: Add a placeholder commit (PR needs at least 1 diff commit)
  const taskContent = [
    `# Copilot Task: Issue #${params.issueNumber}`,
    '',
    `**${params.issueTitle}**`,
    '',
    params.issueBody,
    '',
    `> This file was created to bootstrap the Copilot coding agent.`,
  ].join('\n')

  const { data: blob } = await octokit.git.createBlob({
    owner, repo,
    content: Buffer.from(taskContent).toString('base64'),
    encoding: 'base64',
  })

  const { data: baseCommit } = await octokit.git.getCommit({
    owner, repo, commit_sha: baseSha,
  })

  const { data: tree } = await octokit.git.createTree({
    owner, repo,
    base_tree: baseCommit.tree.sha,
    tree: [{ path: '.copilot-task.md', mode: '100644', type: 'blob', sha: blob.sha }],
  })

  const { data: newCommit } = await octokit.git.createCommit({
    owner, repo,
    message: `chore: bootstrap Copilot task for issue #${params.issueNumber}`,
    tree: tree.sha,
    parents: [baseSha],
  })

  await octokit.git.updateRef({
    owner, repo,
    ref: `heads/${branchName}`,
    sha: newCommit.sha,
  })

  // Step 3: Create draft PR
  const prBody = [
    `Resolves #${params.issueNumber}`,
    '',
    '---',
    `**Issue:** ${params.issueTitle}`,
    '',
    params.issueBody,
  ].join('\n')

  const pr = await createPullRequest({
    title: `[Copilot] ${params.issueTitle}`,
    body: prBody,
    head: branchName,
    draft: true,
  })

  // Step 3: Trigger Copilot via @copilot mention
  const commentParts = [
    `@copilot Please work on this task.`,
    '',
    `## Instructions`,
    params.issueBody,
  ]
  if (params.model) {
    commentParts.push('', `**Preferred model:** ${params.model}`)
  }
  if (params.customInstructions) {
    commentParts.push('', `## Additional Instructions`, params.customInstructions)
  }

  await addPullRequestComment(pr.number, commentParts.join('\n'))

  return {
    prNumber: pr.number,
    prUrl: pr.url,
    branchName,
  }
}

/**
 * @deprecated Use assignCopilotViaGraphQL() or triggerCopilotViaPR() instead.
 * REST API silently drops Copilot assignees. Kept for backwards compatibility.
 */
export async function assignCopilotToIssue(issueNumber: number): Promise<void> {
  try {
    const octokit = getGitHubClient()
    await octokit.issues.addAssignees({
      owner: getOwner(),
      repo: getRepo(),
      issue_number: issueNumber,
      assignees: ['copilot-swe-agent'],
    })
  } catch (err) {
    console.warn(
      `[github-adapter] assignCopilotToIssue: Copilot not available for issue #${issueNumber}. Skipping.`,
      err,
    )
  }
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

export function parseGPTPayload(payload: GPTIdeaPayload): Omit<Idea, 'id' | 'created_at' | 'status'> {
  return {
    title: payload.title,
    raw_prompt: payload.rawPrompt,
    gpt_summary: payload.gptSummary,
    vibe: payload.vibe ?? 'unknown',
    audience: payload.audience ?? 'unknown',
    intent: payload.intent ?? '',
  }
}

```

### lib/adapters/notifications-adapter.ts

```typescript
import type { InboxEvent } from '@/types/inbox'
import { getInboxEvents, markRead } from '@/lib/services/inbox-service'

export async function fetchInboxEvents(): Promise<InboxEvent[]> {
  return getInboxEvents()
}

export async function markEventRead(eventId: string): Promise<void> {
  return markRead(eventId)
}

```

### lib/adapters/vercel-adapter.ts

```typescript
import { getProjectById } from '@/lib/services/projects-service'

export async function fetchPreviewUrl(projectId: string): Promise<string | null> {
  const project = await getProjectById(projectId)
  return project?.activePreviewUrl ?? null
}

export async function fetchDeploymentStatus(_projectId: string): Promise<string> {
  return 'ready'
}

```

### lib/ai/context/facet-context.ts

```typescript
import { getExperienceInstanceById, getExperienceSteps } from '@/lib/services/experience-service';
import { getInteractionsByInstance } from '@/lib/services/interaction-service';
import { getFacetsForUser } from '@/lib/services/facet-service';

/**
 * buildFacetContext(instanceId, userId) assembles the input for the facet extraction flow.
 * 1. Fetches experience instance, steps, and interaction events.
 * 2. Fetches existing facets for the user to help deduplicate or refine.
 * 3. Maps each step along with any relevant user content/responses.
 */
export async function buildFacetContext(instanceId: string, userId: string) {
  const [instance, steps, interactions, existingFacets] = await Promise.all([
    getExperienceInstanceById(instanceId),
    getExperienceSteps(instanceId),
    getInteractionsByInstance(instanceId),
    getFacetsForUser(userId)
  ]);

  if (!instance) {
    throw new Error(`Experience instance not found: \${instanceId}`);
  }

  // Group interactions by stepId
  const interactionsByStep = interactions.reduce((acc, interaction) => {
    if (interaction.step_id) {
      if (!acc[interaction.step_id]) {
        acc[interaction.step_id] = [];
      }
      acc[interaction.step_id].push(interaction);
    }
    return acc;
  }, {} as Record<string, any[]>);

  const stepSummaries = steps.map((step) => {
    const relevantEvents = interactionsByStep[step.id] || [];
    
    // Concatenate all meaningful user responses into a single string
    let responses: string[] = [];
    
    relevantEvents.forEach((event) => {
      const payload = event.event_payload;
      if (!payload) return;

      // standard answer_submitted payload (answers map or reflections map)
      const answerMap = payload.answers || payload.reflections;
      if (answerMap && typeof answerMap === 'object') {
        Object.values(answerMap).forEach((val) => {
          if (typeof val === 'string' && val.trim().length > 0) {
            responses.push(val);
          }
        });
      }

      // task_completed or draft_saved might have content/proof
      if (typeof payload.content === 'string' && payload.content.trim().length > 0) {
        responses.push(payload.content);
      }
      if (typeof payload.proof === 'string' && payload.proof.trim().length > 0) {
        responses.push(payload.proof);
      }
      
      // Generic 'response' field used in some newer interactive step captures
      if (typeof payload.response === 'string' && payload.response.trim().length > 0) {
        responses.push(payload.response);
      }
    });

    return {
      title: step.title,
      type: step.step_type,
      userResponse: responses.length > 0 ? responses.join('\n\n') : undefined
    };
  });

  return {
    experienceTitle: instance.title,
    experienceGoal: instance.goal,
    stepSummaries,
    existingFacets: existingFacets.map(f => ({
      type: f.facet_type as string,
      value: f.value,
      confidence: f.confidence
    }))
  };
}

```

### lib/ai/context/suggestion-context.ts

```typescript
import { buildUserProfile } from '@/lib/services/facet-service';
import { getExperienceInstances, getExperienceTemplates, getExperienceInstanceById } from '@/lib/services/experience-service';

export async function buildSuggestionContext(userId: string, justCompletedInstanceId?: string) {
  const profile = await buildUserProfile(userId);
  const instances = await getExperienceInstances({ userId });
  const templates = await getExperienceTemplates();

  // Completed experience classes
  const completedInstances = instances.filter(i => i.status === 'completed');
  // Need to map instance template_id to template class
  const templateMap = Object.fromEntries(templates.map(t => [t.id, t.class]));
  const completedExperienceClasses = Array.from(new Set(
    completedInstances.map(i => templateMap[i.template_id]).filter(Boolean)
  ));

  let justCompletedTitle: string | undefined;
  let frictionLevel: string | undefined;

  if (justCompletedInstanceId) {
    const instance = await getExperienceInstanceById(justCompletedInstanceId);
    if (instance) {
      justCompletedTitle = instance.title;
      // We can infer friction level from telemetry if available, 
      // but for now we look at the instance metadata if it exists.
      // Progression engine handles real friction math.
      frictionLevel = instance.friction_level || 'normal';
    }
  }

  return {
    userId,
    justCompletedTitle,
    completedExperienceClasses,
    userInterests: profile.topInterests,
    userSkills: profile.topSkills,
    activeGoals: profile.activeGoals,
    frictionLevel,
    availableTemplateClasses: Array.from(new Set(templates.map(t => t.class)))
  };
}

```

### lib/ai/flows/compress-gpt-state.ts

```typescript
import { ai } from '../genkit';
import { z } from 'zod';
import { CompressedStateOutputSchema } from '../schemas';

export const compressGPTStateFlow = ai.defineFlow(
  {
    name: 'compressGPTStateFlow',
    inputSchema: z.object({
      rawStateJSON: z.string().describe('The full GPT state packet as JSON string'),
      tokenBudget: z.number().default(800).describe('Target compressed output length in tokens')
    }),
    outputSchema: CompressedStateOutputSchema,
  },
  async (input) => {
    const { rawStateJSON, tokenBudget } = input;
    
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: `You are a state compression specialist for Mira Studio.
        Identify the most important recent events and overall progress.
        Maintain technical accuracy for IDs and counts.
        Focus on user intent, engagement level (friction), and next steps.
        Compress the narrative to fit within ${tokenBudget} tokens.
        Highlight 3-5 priority signals.
        Suggest a single opening topic for the GPT's next message.`,
      prompt: `Compress this raw mirror state into a high-signal narrative for the user's workspace: ${rawStateJSON}`,
      output: {
        schema: CompressedStateOutputSchema
      }
    });

    if (!output) {
      throw new Error('Failed to generate compressed state');
    }

    return output;
  }
);

```

### lib/ai/flows/extract-facets.ts

```typescript
import { z } from 'zod';
import { ai } from '../genkit';
import { FacetExtractionOutputSchema } from '../schemas';

export const ExtractFacetsInputSchema = z.object({
  experienceTitle: z.string(),
  experienceGoal: z.string().optional(),
  stepSummaries: z.array(z.object({
    title: z.string(),
    type: z.string(),
    userResponse: z.string().optional()
  })),
  existingFacets: z.array(z.object({
    type: z.string(),
    value: z.string(),
    confidence: z.number()
  }))
});

export const extractFacetsFlow = ai.defineFlow(
  {
    name: 'extractFacetsFlow',
    inputSchema: ExtractFacetsInputSchema,
    outputSchema: FacetExtractionOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are an AI coach for Mira Studio. Extract user profile facets based on their responses to an experience.
      
      Experience Context:
      - Title: ${input.experienceTitle}
      - Goal: ${input.experienceGoal || 'Not specified'}
      
      User Interactions:
      ${input.stepSummaries.map(s => `Step: ${s.title} (${s.type})\nUser Response: ${s.userResponse || 'No response'}`).join('\n\n')}
      
      Existing Facets for this user:
      ${input.existingFacets.map(f => `- ${f.type}: ${f.value} (confidence: ${f.confidence})`).join('\n')}
      
      Task:
      Analyze the user's responses and the experience context to extract new or updated profile facets.
      Facets should belong to one of these types:
      - interest: user reveals a topical interest (e.g. sustainable business models, career change)
      - skill: user demonstrates a skill (e.g. analytical thinking, networking, writing)
      - goal: user states or implies a goal (e.g. build something, learn a new framework)
      - preferred_mode: user shows preference for a certain mode (practice, deep_work, immersive)
      - preferred_depth: user shows preference for a certain depth (light, medium, heavy)
      - friction_pattern: observed resistance or ease (e.g. struggles with planning, excels at creative tasks)
      
      Guidelines:
      1. Be specific. Instead of "Interested in tech", use "Interested in sustainable business models".
      2. Set confidence based on strength of evidence (0.0 to 1.0).
      3. For each facet, provide a brief "evidence" string explaining why you extracted it.
      4. Compare with existing facets; if a facet already exists but the new evidence is stronger, update it.
      
      Output the facets in the provided structured format.
    `;

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: FacetExtractionOutputSchema }
    });

    return output || { facets: [] };
  }
);

```

### lib/ai/flows/refine-knowledge-flow.ts

```typescript
import { ai } from '../genkit';
import { z } from 'zod';
import { KnowledgeEnrichmentOutputSchema } from '../schemas';
import { getKnowledgeUnitById } from '@/lib/services/knowledge-service';

/**
 * refineKnowledgeFlow - Lane 2
 * Implements intelligent enrichment for knowledge units.
 */
export const refineKnowledgeFlow = ai.defineFlow(
  {
    name: 'refineKnowledgeFlow',
    inputSchema: z.object({ unitId: z.string(), userId: z.string() }),
    outputSchema: KnowledgeEnrichmentOutputSchema,
  },
  async (input) => {
    const { unitId } = input;
    
    // 1. Fetch the unit
    const unit = await getKnowledgeUnitById(unitId);
    if (!unit) throw new Error(`Knowledge unit ${unitId} not found`);
    
    // 2. Build prompt context
    const prompt = `
      System: You are an educational content engineer for Mira Studio.
      Task: Given a knowledge unit with a thesis and content, generate high-density enrichment artifacts.
      
      KNOWLEDGE UNIT:
      Title: "${unit.title}"
      Topic: "${unit.topic}"
      Domain: "${unit.domain}"
      Thesis: "${unit.thesis}"
      Content: "${unit.content}"
      Key Ideas: ${unit.key_ideas.join(', ')}
      
      Requirements:
      1. Retrieval Questions: Generate 3-5 questions that test deep understanding of the thesis and content. Assign a difficulty level (easy, medium, hard).
      2. Cross-domain Links: Identify 2-3 related professional or educational domains where this knowledge is applicable. Explain why.
      3. Skill Tags: Suggest 5-7 specific skill tags (e.g., "SaaS Dynamics", "Unit Economics", "Product Market Fit") related to this content.
    `;
    
    // 3. Generate output
    const { output } = await ai.generate({
      // Use gemini-2.5-flash as the standard model for enrichment
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: KnowledgeEnrichmentOutputSchema }
    });
    
    if (!output) throw new Error('AI failed to generate knowledge enrichment');
    
    return output;
  }
);

```

### lib/ai/flows/suggest-next-experience.ts

```typescript
import { z } from 'zod';
import { ai } from '../genkit';
import { SuggestionOutputSchema } from '../schemas';

export const SuggestNextExperienceInputSchema = z.object({
  userId: z.string(),
  justCompletedTitle: z.string().optional(),
  completedExperienceClasses: z.array(z.string()),
  userInterests: z.array(z.string()),
  userSkills: z.array(z.string()),
  activeGoals: z.array(z.string()),
  frictionLevel: z.string().optional(),
  availableTemplateClasses: z.array(z.string())
});

export const suggestNextExperienceFlow = ai.defineFlow(
  {
    name: 'suggestNextExperienceFlow',
    inputSchema: SuggestNextExperienceInputSchema,
    outputSchema: SuggestionOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are an AI coach for Mira Studio. Suggest 2-3 context-aware next experiences for the user.
      
      User Profile:
      - Interests: ${input.userInterests.join(', ')}
      - Skills: ${input.userSkills.join(', ')}
      - Active Goals: ${input.activeGoals.join(', ')}
      
      User History:
      - Completed experience classes: ${input.completedExperienceClasses.join(', ')}
      ${input.justCompletedTitle ? `- Just completed: ${input.justCompletedTitle}` : ''}
      - Observed friction level: ${input.frictionLevel || 'normal'}
      
      Available next experience types (template classes):
      ${input.availableTemplateClasses.join(', ')}
      
      Criteria for suggestions:
      1. Alignment with user goals and interests.
      2. Logical progression based on history.
      3. Adapt for friction: if high, suggest lighter-weight (mode: practice, depth: light) experiences.
      4. Diversity: dont just suggest the same class repeatedly.
      
      Provide your reasoning for each suggestion. Each suggestedResolution must include:
      - depth: 'light' | 'medium' | 'heavy'
      - mode: 'practice' | 'deep_work' | 'immersive'
      - timeScope: 'immediate' | 'session' | 'multi_day' | 'ongoing'
      - intensity: 'chill' | 'focused' | 'intense'
    `;

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: SuggestionOutputSchema }
    });

    if (!output) {
      return { suggestions: [] };
    }

    return output;
  }
);

```

### lib/ai/flows/synthesize-experience.ts

```typescript
import { ai } from '../genkit';
import { z } from 'zod';
import { SynthesisOutputSchema } from '../schemas';
import { getInteractionsByInstance } from '@/lib/services/interaction-service';
import { getExperienceInstanceById, getExperienceSteps } from '@/lib/services/experience-service';

/**
 * synthesizeExperienceFlow - Lane 1
 * Implements intelligent narrative synthesis for a completed experience.
 */
export const synthesizeExperienceFlow = ai.defineFlow(
  {
    name: 'synthesizeExperienceFlow',
    inputSchema: z.object({ instanceId: z.string(), userId: z.string() }),
    outputSchema: SynthesisOutputSchema,
  },
  async (input) => {
    const { instanceId } = input;
    
    // 1. Fetch data
    const instance = await getExperienceInstanceById(instanceId);
    if (!instance) throw new Error(`Experience instance ${instanceId} not found`);
    
    const steps = await getExperienceSteps(instanceId);
    const interactions = await getInteractionsByInstance(instanceId);
    
    // 2. Build prompt context
    const stepSummary = steps.map(s => `${s.step_order + 1}. [${s.step_type}] ${s.title}`).join('\n');
    const interactionSummary = interactions.map(i => {
      const type = i.event_type;
      const payload = JSON.stringify(i.event_payload);
      return `- Event: ${type} | Payload: ${payload}`;
    }).join('\n');
    
    const prompt = `
      System: You are an experience analyst for Mira Studio.
      Task: Synthesize a user's journey through a structured experience.
      
      EXPERIENCE:
      Title: "${instance.title}"
      Goal: "${instance.goal || 'Not specified'}"
      Resolution: ${JSON.stringify(instance.resolution)}
      
      STRUCTURE:
      ${stepSummary}
      
      USER ACTIVITY:
      ${interactionSummary}
      
      Analysis Requirements:
      1. Provide a narrative (2-3 sentences) on what actually happened.
      2. Extract 3-5 behavioral signals (e.g., fast completion, deep reflections, specific interests).
      3. Assess friction: was it too hard, too easy, or just right?
      4. Suggest 2-3 next experience paths based on their output.
    `;
    
    // 3. Generate output
    const { output } = await ai.generate({
      // Use gemini-2.0-flash as the fast model for frequently-called flows
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: SynthesisOutputSchema }
    });
    
    if (!output) throw new Error('AI failed to generate synthesis');
    
    return output;
  }
);

```

### lib/ai/genkit.ts

```typescript
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
});

export { googleAI };

```

### lib/ai/safe-flow.ts

```typescript
export async function runFlowSafe<T>(flowFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set. Flow execution skipped.');
      return fallback;
    }
    return await flowFn();
  } catch (error) {
    console.error('Flow execution failed:', error);
    return fallback;
  }
}

```

### lib/ai/schemas.ts

```typescript
import { z } from 'zod';

export const SynthesisOutputSchema = z.object({
  narrative: z.string().describe('2-3 sentence summary of what happened and what it means'),
  keySignals: z.array(z.string()).describe('3-5 key behavioral signals observed'),
  frictionAssessment: z.string().describe('One sentence: was the user engaged, struggling, or coasting?'),
  nextCandidates: z.array(z.string()).describe('2-3 suggested next experience types with reasoning')
});

export const FacetExtractionOutputSchema = z.object({
  facets: z.array(z.object({
    facetType: z.enum(['interest', 'skill', 'goal', 'preferred_mode', 'preferred_depth', 'friction_pattern']),
    value: z.string(),
    confidence: z.number().min(0).max(1),
    evidence: z.string()
  }))
});

export const SuggestionOutputSchema = z.object({
  suggestions: z.array(z.object({
    templateClass: z.string(),
    reason: z.string(),
    confidence: z.number(),
    suggestedResolution: z.object({
      depth: z.string(),
      mode: z.string(),
      timeScope: z.string(),
      intensity: z.string()
    })
  }))
});

export const CompressedStateOutputSchema = z.object({
  compressedNarrative: z.string().describe('Token-efficient narrative summary of user state'),
  prioritySignals: z.array(z.string()).describe('Top 3-5 signals the GPT should act on'),
  suggestedOpeningTopic: z.string().describe('What the GPT should bring up first')
});

export const KnowledgeEnrichmentOutputSchema = z.object({
  retrieval_questions: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
  })),
  cross_links: z.array(z.object({
    related_domain: z.string(),
    reason: z.string(),
  })),
  skill_tags: z.array(z.string()),
});

```

### lib/config/github.ts

```typescript
/**
 * lib/config/github.ts
 * Centralized GitHub configuration — reads from env vars, validates presence
 * of required vars (in dev), and exposes typed helpers for repo coordinates.
 */

export interface GitHubConfig {
  token: string
  owner: string
  repo: string
  defaultBranch: string
  webhookSecret: string
  /** Optional: name of the prototype workflow file (e.g. "copilot-prototype.yml") */
  workflowPrototype: string
  /** Optional: name of the fix-request workflow file */
  workflowFixRequest: string
  /** Optional: label prefix applied to GitHub issues created by Mira */
  labelPrefix: string
  /** Optional: public base URL for this deployment (e.g. "https://mira.vercel.app") */
  appBaseUrl: string
}

const REQUIRED_VARS = [
  'GITHUB_TOKEN',
  'GITHUB_OWNER',
  'GITHUB_REPO',
  'GITHUB_WEBHOOK_SECRET',
] as const

/**
 * Returns true if the minimum required GitHub env vars are present.
 * Use this for graceful degradation (local-only mode).
 */
export function isGitHubConfigured(): boolean {
  return REQUIRED_VARS.every((key) => Boolean(process.env[key]))
}

/**
 * Returns the full "owner/repo" string.
 * Throws if GitHub is not configured.
 */
export function getRepoFullName(): string {
  const config = getGitHubConfig()
  return `${config.owner}/${config.repo}`
}

/**
 * Returns just the owner + repo fields as a plain object.
 * Convenient for Octokit calls that take `{ owner, repo }`.
 */
export function getRepoCoordinates(): { owner: string; repo: string } {
  const config = getGitHubConfig()
  return { owner: config.owner, repo: config.repo }
}

/**
 * Returns the full validated GitHub config object.
 * In development, throws with a clear message if required vars are absent.
 * In production (NODE_ENV === 'production'), returns a partial/empty config
 * instead of throwing so the build step can succeed even without secrets.
 */
export function getGitHubConfig(): GitHubConfig {
  const isDev = process.env.NODE_ENV !== 'production'

  if (isDev) {
    const missing = REQUIRED_VARS.filter((key) => !process.env[key])
    if (missing.length > 0) {
      // Only throw when someone actually tries to use GitHub features — not at
      // import time — so the rest of the app still boots without GitHub vars.
      throw new Error(
        `[Mira] Missing required GitHub env vars: ${missing.join(', ')}. ` +
          `Check .env.local and wiring.md for setup instructions.`
      )
    }
  }

  return {
    token: process.env.GITHUB_TOKEN ?? '',
    owner: process.env.GITHUB_OWNER ?? '',
    repo: process.env.GITHUB_REPO ?? '',
    defaultBranch: process.env.GITHUB_DEFAULT_BRANCH ?? 'main',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? '',
    workflowPrototype: process.env.GITHUB_WORKFLOW_PROTOTYPE ?? '',
    workflowFixRequest: process.env.GITHUB_WORKFLOW_FIX_REQUEST ?? '',
    labelPrefix: process.env.GITHUB_LABEL_PREFIX ?? 'mira:',
    appBaseUrl: process.env.APP_BASE_URL ?? '',
  }
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

export const STORAGE_DIR = '.local-data'
export const STORAGE_PATH = `${STORAGE_DIR}/studio.json`

// --- Sprint 2: GitHub execution modes ---

export const EXECUTION_MODES = [
  'copilot_issue_assignment',
  'custom_workflow_dispatch',
  'local_agent',
] as const

export type ExecutionMode = (typeof EXECUTION_MODES)[number]

export const AGENT_RUN_KINDS = [
  'prototype',
  'fix_request',
  'spec',
  'research_summary',
  'copilot_issue_assignment',
] as const

export const AGENT_RUN_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'blocked',
] as const

// --- Sprint 3: Dev Auto-Login ---
// Hardcoded user for development — no auth required.
// Matches the seed row in Supabase: users.id = 'a0000000-0000-0000-0000-000000000001'
export const DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000001'

// Seeded template IDs
export const DEFAULT_TEMPLATE_IDS = {
  questionnaire: 'b0000000-0000-0000-0000-000000000001',
  lesson: 'b0000000-0000-0000-0000-000000000002',
  challenge: 'b0000000-0000-0000-0000-000000000003',
  plan_builder: 'b0000000-0000-0000-0000-000000000004',
  reflection: 'b0000000-0000-0000-0000-000000000005',
  essay_tasks: 'b0000000-0000-0000-0000-000000000006',
} as const

// --- Sprint 3: Experience Engine ---

export const EXPERIENCE_CLASSES = [
  'questionnaire',
  'lesson',
  'challenge',
  'plan_builder',
  'reflection',
  'essay_tasks',
] as const

export type ExperienceClass = (typeof EXPERIENCE_CLASSES)[number]

export const EXPERIENCE_STATUSES = [
  'proposed',
  'drafted',
  'ready_for_review',
  'approved',
  'published',
  'active',
  'completed',
  'archived',
  'superseded',
  'injected',
] as const

export type ExperienceStatus = (typeof EXPERIENCE_STATUSES)[number]

export const EPHEMERAL_STATUSES = ['injected', 'active', 'completed', 'archived'] as const

export const RESOLUTION_DEPTHS = ['light', 'medium', 'heavy'] as const
export const RESOLUTION_MODES = ['illuminate', 'practice', 'challenge', 'build', 'reflect'] as const
export const RESOLUTION_TIME_SCOPES = ['immediate', 'session', 'multi_day', 'ongoing'] as const
export const RESOLUTION_INTENSITIES = ['low', 'medium', 'high'] as const

export type ResolutionDepth = (typeof RESOLUTION_DEPTHS)[number]
export type ResolutionMode = (typeof RESOLUTION_MODES)[number]
export type ResolutionTimeScope = (typeof RESOLUTION_TIME_SCOPES)[number]
export type ResolutionIntensity = (typeof RESOLUTION_INTENSITIES)[number]

// --- Sprint 8: Knowledge Tab ---

export const KNOWLEDGE_UNIT_TYPES = ['foundation', 'playbook', 'deep_dive', 'example', 'audio_script'] as const
export type KnowledgeUnitType = (typeof KNOWLEDGE_UNIT_TYPES)[number]

export const MASTERY_STATUSES = ['unseen', 'read', 'practiced', 'confident'] as const
export type MasteryStatus = (typeof MASTERY_STATUSES)[number]

// --- Sprint 9: Content Density ---

export const CONTENT_BUILDER_TYPES = ['foundation', 'playbook', 'deep_dive', 'example', 'audio_script'] as const
export type ContentBuilderType = (typeof CONTENT_BUILDER_TYPES)[number]


```

### lib/contracts/experience-contract.ts

```typescript
/**
 * v1 Experience Instance Contract
 * ================================
 * All fields here are CONTRACTED — validators and renderers may depend on them.
 * Adding a field = non-breaking. Removing/renaming = breaking (requires version bump).
 *
 * Field Stability Levels:
 * - @stable   — will not change within this contract version
 * - @evolving — may gain new valid values (e.g., new instance_type options)
 * - @computed — system-written, read-only to creators (GPT/API may not set these)
 *
 * @version 1
 */

import type { ResolutionContractV1, ReentryContractV1 } from './resolution-contract'

// ---------------------------------------------------------------------------
// Contract version
// ---------------------------------------------------------------------------

/** Current contract version. Validators/renderers target this version. */
export const EXPERIENCE_CONTRACT_VERSION = 1

// ---------------------------------------------------------------------------
// Payload versioning
// ---------------------------------------------------------------------------

/**
 * PAYLOAD VERSIONING STRATEGY (v1):
 *
 * Step payloads MAY carry an optional `v` field at the top level.
 * - If `v` is absent → treat as v1.
 * - If `v` matches EXPERIENCE_CONTRACT_VERSION → validate normally.
 * - If `v` > EXPERIENCE_CONTRACT_VERSION → pass-through with warning (don't reject).
 * - If `v` < 1 → reject as invalid.
 *
 * Rules:
 * - New fields are additive-only within the same version.
 * - Removing or renaming a contracted field = version bump.
 * - v1 does NOT wrap payloads in an envelope (existing data has no `v` field).
 *   The `v` field is a top-level optional field on the payload itself.
 */
export const PAYLOAD_VERSION_FIELD = 'v' as const
export const SUPPORTED_PAYLOAD_VERSION = 1

/** Envelope for future use. v1 does NOT require wrapping — `v` is a flat top-level field. */
export interface StepPayloadEnvelope<T = unknown> {
  /** Payload version. Defaults to 1 if absent. */
  v?: number
  /** The typed payload data. */
  data: T
}

// ---------------------------------------------------------------------------
// Experience statuses (contracted subset — aligned with state machine)
// ---------------------------------------------------------------------------

/** @stable */
export type ExperienceStatusContracted =
  | 'proposed'
  | 'drafted'
  | 'ready_for_review'
  | 'approved'
  | 'published'
  | 'active'
  | 'completed'
  | 'archived'
  | 'superseded'
  | 'injected'

// ---------------------------------------------------------------------------
// v1 Experience Instance Contract
// ---------------------------------------------------------------------------

export interface ExperienceInstanceContractV1 {
  // ── Identity ── @stable
  id: string
  user_id: string
  template_id: string

  // ── Content ── @stable
  /** Max 200 characters. */
  title: string
  /** Max 1000 characters. */
  goal: string

  // ── Classification ── @evolving (may gain new instance_type values)
  instance_type: 'persistent' | 'ephemeral'
  status: ExperienceStatusContracted

  // ── Behavior ── @stable structure, @evolving enum values
  resolution: ResolutionContractV1
  reentry: ReentryContractV1 | null

  // ── Graph ── @stable
  previous_experience_id: string | null
  next_suggested_ids: string[]

  // ── Metadata ── @stable
  /** Who created this instance. @evolving — may gain new generator values. */
  generated_by: string | null   // 'gpt' | 'dev-harness' | 'api' | 'coder'
  source_conversation_id: string | null
  /** ISO 8601. */
  created_at: string
  /** ISO 8601. Set on publish transition. */
  published_at: string | null

  // ── Computed ── @computed (system-written, read-only to creators)
  /** Computed by progression engine. Never set by GPT/API directly. */
  friction_level: 'low' | 'medium' | 'high' | null
}

/** Contracted fields a creator (GPT/API) may set when creating an instance. */
export type CreatableInstanceFields = Omit<
  ExperienceInstanceContractV1,
  'id' | 'created_at' | 'published_at' | 'friction_level' | 'status'
>

// ---------------------------------------------------------------------------
// Module Roles — capability-oriented, not product-taxonomy
// ---------------------------------------------------------------------------

/**
 * MODULE ROLES describe what a module DOES, not what it IS.
 * The same step_type can serve different roles in different experiences.
 *
 * This mapping keeps graph/timeline/profile generic:
 * - A "questionnaire" step has role "capture" — it captures user input.
 * - A "lesson" step has role "deliver" — it delivers content.
 * - A "challenge" step has role "activate" — it activates the user.
 *
 * @stable — roles may be added but not renamed or removed.
 */
export type ModuleRole = 'capture' | 'deliver' | 'activate' | 'synthesize' | 'plan' | 'produce'

/** Maps contracted step types to their capability role. */
export const STEP_TYPE_ROLES: Record<string, ModuleRole> = {
  questionnaire: 'capture',
  lesson: 'deliver',
  challenge: 'activate',
  reflection: 'synthesize',
  plan_builder: 'plan',
  essay_tasks: 'produce',
}

/**
 * Human-readable labels for capability roles.
 * Used by graph/timeline/profile for generic labeling that won't break
 * when step types are renamed or new types are added.
 */
export const MODULE_ROLE_LABELS: Record<ModuleRole, string> = {
  capture: 'Input captured',
  deliver: 'Content delivered',
  activate: 'Challenge completed',
  synthesize: 'Reflection recorded',
  plan: 'Plan built',
  produce: 'Artifact produced',
}

/**
 * Resolve the capability role for a step type.
 * Returns undefined for unregistered types (unknown steps).
 */
export function getModuleRole(stepType: string): ModuleRole | undefined {
  return STEP_TYPE_ROLES[stepType]
}

```

### lib/contracts/resolution-contract.ts

```typescript
/**
 * v1 Resolution + Re-entry Contract
 * ===================================
 * Resolution controls renderer chrome, coder spec shape, and GPT entry behavior.
 * Re-entry controls how GPT re-enters a user's context after an experience event.
 *
 * @version 1
 */

// ---------------------------------------------------------------------------
// Resolution contract
// ---------------------------------------------------------------------------

/** @stable — values may be added but not removed */
export type ResolutionDepthV1 = 'light' | 'medium' | 'heavy'

/** @evolving — new modes may be added */
export type ResolutionModeV1 = 'illuminate' | 'practice' | 'challenge' | 'build' | 'reflect'

/** @evolving — new scopes may be added */
export type ResolutionTimeScopeV1 = 'immediate' | 'session' | 'multi_day' | 'ongoing'

/** @stable */
export type ResolutionIntensityV1 = 'low' | 'medium' | 'high'

/** All 4 fields are required. @stable structure, @evolving enum values. */
export interface ResolutionContractV1 {
  depth: ResolutionDepthV1
  mode: ResolutionModeV1
  timeScope: ResolutionTimeScopeV1
  intensity: ResolutionIntensityV1
}

// ---------------------------------------------------------------------------
// Resolution → Chrome mapping (contracted renderer behavior)
// ---------------------------------------------------------------------------

export interface ResolutionChromeConfig {
  /** Show full header with title/goal. */
  showHeader: boolean
  /** Show step progress bar. */
  showProgress: boolean
  /** Show goal text in header. */
  showGoal: boolean
}

/**
 * Maps resolution depth to renderer chrome configuration.
 * This is the contracted mapping — renderers MUST use this, not hand-wire chrome.
 *
 * - `light`  → immersive, no chrome (clean step only)
 * - `medium` → progress bar + step title
 * - `heavy`  → full header with goal, progress, description
 *
 * @stable
 */
export const RESOLUTION_CHROME_MAP: Record<ResolutionDepthV1, ResolutionChromeConfig> = {
  light:  { showHeader: false, showProgress: false, showGoal: false },
  medium: { showHeader: false, showProgress: true,  showGoal: false },
  heavy:  { showHeader: true,  showProgress: true,  showGoal: true  },
}

/**
 * Look up chrome config for a depth value.
 * Falls back to 'medium' for unknown values (defensive).
 */
export function getChromeForDepth(depth: ResolutionDepthV1): ResolutionChromeConfig {
  return RESOLUTION_CHROME_MAP[depth] ?? RESOLUTION_CHROME_MAP.medium
}

// ---------------------------------------------------------------------------
// Valid enum values (for validators)
// ---------------------------------------------------------------------------

export const VALID_DEPTHS: readonly ResolutionDepthV1[] = ['light', 'medium', 'heavy']
export const VALID_MODES: readonly ResolutionModeV1[] = ['illuminate', 'practice', 'challenge', 'build', 'reflect']
export const VALID_TIME_SCOPES: readonly ResolutionTimeScopeV1[] = ['immediate', 'session', 'multi_day', 'ongoing']
export const VALID_INTENSITIES: readonly ResolutionIntensityV1[] = ['low', 'medium', 'high']

// ---------------------------------------------------------------------------
// Re-entry contract
// ---------------------------------------------------------------------------

/** @evolving — new trigger types may be added */
export type ReentryTriggerV1 = 'time' | 'completion' | 'inactivity' | 'manual'

/** @evolving — new context scopes may be added */
export type ReentryContextScopeV1 = 'minimal' | 'full' | 'focused'

/**
 * Re-entry contract: defines how GPT re-enters after an experience event.
 *
 * - `trigger` — when to fire (completion, inactivity, time-based, manual)
 * - `prompt` — what GPT says on re-entry (max 500 chars)
 * - `contextScope` — how much history GPT should load
 *
 * @stable structure, @evolving enum values
 */
export interface ReentryContractV1 {
  trigger: ReentryTriggerV1
  /** Max 500 characters. The GPT message on re-entry. */
  prompt: string
  contextScope: ReentryContextScopeV1
}

// ---------------------------------------------------------------------------
// Validation helpers (for use by Lane 4 validators)
// ---------------------------------------------------------------------------

export const VALID_TRIGGERS: readonly ReentryTriggerV1[] = ['time', 'completion', 'inactivity', 'manual']
export const VALID_CONTEXT_SCOPES: readonly ReentryContextScopeV1[] = ['minimal', 'full', 'focused']

```

### lib/contracts/step-contracts.ts

```typescript
/**
 * v1 Step Payload Contracts
 * =========================
 * Per-type payload contracts define ONLY the fields that validators and renderers
 * may depend on. Renderers MUST NOT read fields outside these contracts.
 * Validators MUST NOT reject payloads for having extra fields.
 *
 * @version 1
 */

// ---------------------------------------------------------------------------
// Base step contract (shared by all step types)
// ---------------------------------------------------------------------------

/** @stable — all steps have these fields */
export interface StepContractBase {
  id: string
  instance_id: string
  step_order: number
  /** Registered step type key. See CONTRACTED_STEP_TYPES for known types. */
  step_type: string
  title: string
  /** Typed per step_type — see individual payload contracts below. */
  payload: unknown
  completion_rule: string | null
  /** @evolving — v1.1 status and scheduling */
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  /** @evolving — v1.1 scheduling: ISO 8601 date (YYYY-MM-DD) */
  scheduled_date?: string | null;
  /** @evolving — v1.1 scheduling: ISO 8601 date (YYYY-MM-DD) */
  due_date?: string | null;
  /** @evolving — v1.1 scheduling */
  estimated_minutes?: number | null;
  /** @evolving — v1.1 completion timestamp */
  completed_at?: string | null;
}

// ---------------------------------------------------------------------------
// Contracted step types
// ---------------------------------------------------------------------------

/**
 * Step types with formal payload contracts.
 * Validators MUST validate payloads for these types.
 * Unknown types outside this list pass validation (see UNKNOWN_STEP_POLICY).
 *
 * @stable — types may be added but not removed.
 */
export const CONTRACTED_STEP_TYPES = [
  'questionnaire',
  'lesson',
  'challenge',
  'reflection',
  'plan_builder',
  'essay_tasks',
] as const

export type ContractedStepType = (typeof CONTRACTED_STEP_TYPES)[number]

/** Type guard: is this step type contracted? */
export function isContractedStepType(type: string): type is ContractedStepType {
  return (CONTRACTED_STEP_TYPES as readonly string[]).includes(type)
}

// ---------------------------------------------------------------------------
// Per-type payload contracts
// ---------------------------------------------------------------------------

// ── Questionnaire ──

export interface QuestionnaireQuestion {
  id: string
  /** The display text of the question. Renderers use `label`, not `text`. */
  label: string
  type: 'text' | 'choice' | 'scale'
  /** Required when type = 'choice'. Optional scale anchor labels for type = 'scale'. */
  options?: string[]
}

/** @stable */
export interface QuestionnairePayloadV1 {
  v?: number
  questions: QuestionnaireQuestion[]
}

// ── Lesson ──

export interface LessonSection {
  heading?: string
  body: string
  /** @evolving — may gain new section types (e.g., 'video', 'quiz') */
  type?: 'text' | 'callout' | 'checkpoint'
}

/** @stable */
export interface LessonPayloadV1 {
  v?: number
  sections: LessonSection[]
}

// ── Challenge ──

export interface ChallengeObjective {
  id: string
  description: string
  /** When true, the user must provide proof text to mark complete. */
  proof_required?: boolean
}

/** @stable */
export interface ChallengePayloadV1 {
  v?: number
  objectives: ChallengeObjective[]
}

// ── Reflection ──

export interface ReflectionPrompt {
  id: string
  text: string
  /** @evolving — may gain new format types */
  format?: 'free_text' | 'rating'
}

/** @stable */
export interface ReflectionPayloadV1 {
  v?: number
  prompts: ReflectionPrompt[]
}

// ── Plan Builder ──

export interface PlanBuilderItem {
  id: string
  text: string
  done?: boolean
}

export interface PlanBuilderSection {
  type: 'goals' | 'milestones' | 'resources'
  title?: string
  items: PlanBuilderItem[]
}

/** @stable */
export interface PlanBuilderPayloadV1 {
  v?: number
  sections: PlanBuilderSection[]
}

// ── Essay + Tasks ──

export interface EssayTask {
  id: string
  description: string
  done?: boolean
}

/** @stable */
export interface EssayTasksPayloadV1 {
  v?: number
  /** The essay/reading content. */
  content: string
  tasks: EssayTask[]
}

// ---------------------------------------------------------------------------
// Discriminated union (for typed dispatch)
// ---------------------------------------------------------------------------

/**
 * Union of all contracted v1 step payloads.
 * Use with `step_type` as the discriminator for type narrowing.
 */
export type StepPayloadV1 =
  | QuestionnairePayloadV1
  | LessonPayloadV1
  | ChallengePayloadV1
  | ReflectionPayloadV1
  | PlanBuilderPayloadV1
  | EssayTasksPayloadV1

/**
 * Maps contracted step type string to its payload type.
 * Usage: `StepPayloadMap['questionnaire']` → `QuestionnairePayloadV1`
 */
export interface StepPayloadMap {
  questionnaire: QuestionnairePayloadV1
  lesson: LessonPayloadV1
  challenge: ChallengePayloadV1
  reflection: ReflectionPayloadV1
  plan_builder: PlanBuilderPayloadV1
  essay_tasks: EssayTasksPayloadV1
}

// ---------------------------------------------------------------------------
// Unknown step fallback policy
// ---------------------------------------------------------------------------

/**
 * UNKNOWN STEP POLICY (v1):
 *
 * - Validators: PASS unknown step types (don't reject — future step types
 *   should not fail validation). Log a warning.
 *
 * - Renderers: Fall back to FallbackStep component (already exists in
 *   renderer-registry.tsx). FallbackStep renders step_type + raw payload
 *   as formatted JSON.
 *
 * - GPT: May create steps with unregistered types. The system accepts them
 *   gracefully. The contract doesn't enumerate all possible types — it
 *   enumerates CONTRACTED types.
 *
 * This ensures forward compatibility: a v2 GPT can emit step types that v1
 * renderers don't understand, and the system degrades gracefully instead of
 * crashing.
 *
 * @stable
 */
export const UNKNOWN_STEP_POLICY = 'pass-through-with-fallback' as const

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

### lib/experience/CAPTURE_CONTRACT.md

```markdown
# Mira Interaction Capture — Contract

> Documentation for the telemetry layer of the Mira Experience Engine.

This document defines the interface and behaviors for tracking user interactions within an Experience. It is used by the `useInteractionCapture` hook and implemented by the `/api/interactions` endpoint.

---

## API Endpoint

**`POST /api/interactions`**

### Request Body Schema
```json
{
  "instanceId": "string (UUID)",
  "stepId": "string (UUID) | optional",
  "eventType": "InteractionEventType",
  "eventPayload": "object (JSONB) | optional"
}
```

---

## Event Types & Payloads

### 1. `step_viewed`
- **Trigger**: Fired when a user enters/views a specific step in an experience.
- **`stepId`**: Required.
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_1",
    "eventType": "step_viewed"
  }
  ```

### 2. `answer_submitted`
- **Trigger**: Fired when a user submits data for a specific step (e.g., questionnaire responses).
- **`stepId`**: Required.
- **Payload**: `{ answers: Record<string, any> }`
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_1",
    "eventType": "answer_submitted",
    "eventPayload": {
      "answers": { "q1": "val1", "q2": "val2" }
    }
  }
  ```

### 3. `task_completed`
- **Trigger**: Fired when a specific task or objective within a step is marked as complete.
- **`stepId`**: Required.
- **Payload**: Optional metadata about completion.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_2",
    "eventType": "task_completed"
  }
  ```

### 4. `step_skipped`
- **Trigger**: Fired when a user chooses to skip an optional step.
- **`stepId`**: Required.
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_3",
    "eventType": "step_skipped"
  }
  ```

### 5. `time_on_step`
- **Trigger**: Fired when a user leaves a step (navigates away or finishes). Measures active dwell time.
- **`stepId`**: Required.
- **Payload**: `{ durationMs: number }`
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_1",
    "eventType": "time_on_step",
    "eventPayload": { "durationMs": 45000 }
  }
  ```

### 6. `experience_started`
- **Trigger**: Fired once when the experience is first loaded in the workspace.
- **`stepId`**: Optional (usually null).
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "eventType": "experience_started"
  }
  ```

### 7. `experience_completed`
- **Trigger**: Fired when the user reaches the final "complete" state of the entire experience.
- **`stepId`**: Optional (usually null).
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "eventType": "experience_completed"
  }
  ```

---

## Usage in Renderers (Lane 6 Integration)

Renderers should use the `useInteractionCapture` hook:

1.  **Initialize**: `const telemetry = useInteractionCapture(instanceId)`
2.  **Mount**: `useEffect(() => telemetry.trackExperienceStart(), [])`
3.  **Step Entry**: `useEffect(() => { telemetry.trackStepView(currentStepId); telemetry.startStepTimer(currentStepId); return () => telemetry.endStepTimer(currentStepId); }, [currentStepId])`
4.  **Submission**: Pass `telemetry.trackAnswer`, `telemetry.trackComplete`, and `telemetry.trackSkip` down to individual step components.
5.  **Finalize**: Call `telemetry.trackExperienceComplete()` when the experience orchestrator reaches the end state.

```

### lib/experience/interaction-events.ts

```typescript
/**
 * Interaction Event Types for the Mira Experience Engine.
 * These are the canonical event names used for telemetry.
 */
export const INTERACTION_EVENTS = {
  STEP_VIEWED: 'step_viewed',
  ANSWER_SUBMITTED: 'answer_submitted',
  TASK_COMPLETED: 'task_completed',
  STEP_SKIPPED: 'step_skipped',
  TIME_ON_STEP: 'time_on_step',
  EXPERIENCE_STARTED: 'experience_started',
  EXPERIENCE_COMPLETED: 'experience_completed',
  DRAFT_SAVED: 'draft_saved',
} as const;

export type InteractionEventType = (typeof INTERACTION_EVENTS)[keyof typeof INTERACTION_EVENTS];

/**
 * Utility to build a typed interaction payload.
 * This ensures consistency across different capture points.
 */
export function buildInteractionPayload(
  eventType: InteractionEventType,
  instanceId: string,
  stepId?: string,
  extra: Record<string, any> = {}
) {
  return {
    instanceId,
    stepId,
    eventType,
    eventPayload: extra,
  };
}

```

### lib/experience/progression-engine.ts

```typescript
import { ExperienceStep } from '@/types/experience';
import { InteractionEvent } from '@/types/interaction';
import { getInteractionsByInstance } from '@/lib/services/interaction-service';
import { updateExperienceInstance, getExperienceSteps } from '@/lib/services/experience-service';

/**
 * Progression Engine
 * Computes scores and friction for experiences based on interaction telemetry.
 */

export function computeStepScore(step: ExperienceStep, interactions: InteractionEvent[]): number {
  const stepInteractions = interactions.filter(i => i.step_id === step.id);
  
  switch (step.step_type) {
    case 'questionnaire': {
      const questions = (step.payload as any)?.questions || [];
      if (questions.length === 0) return 100;
      const answers = stepInteractions.filter(i => i.event_type === 'answer_submitted');
      // Questionnaire emits { answers: { questionId: value, ... } } as event_payload.
      // We need to unwrap the answers field to count individual question IDs.
      const answeredIds = new Set<string>();
      answers.forEach(a => {
        if (a.event_payload) {
          const innerAnswers = a.event_payload.answers || a.event_payload;
          Object.keys(innerAnswers).forEach(key => answeredIds.add(key));
        }
      });
      const percent = (answeredIds.size / questions.length) * 100;
      return Math.min(percent, 100);
    }
    case 'lesson': {
      const isViewed = stepInteractions.some(i => i.event_type === 'step_viewed');
      const sections = (step.payload as any)?.sections || [];
      const checkpoints = sections.filter((s: any) => s.type === 'checkpoint');
      
      if (checkpoints.length === 0) return isViewed ? 100 : 0;
      
      const isCompleted = stepInteractions.some(i => i.event_type === 'task_completed');
      if (isCompleted) return 100;
      return isViewed ? 50 : 0;
    }
    case 'challenge': {
      const objectives = (step.payload as any)?.objectives || [];
      if (objectives.length === 0) return 100;
      const completionEvent = stepInteractions.find(i => i.event_type === 'task_completed');
      if (!completionEvent) return 0;
      const completedObjs = completionEvent.event_payload?.completedObjectives || {};
      const percent = (Object.keys(completedObjs).length / objectives.length) * 100;
      return Math.min(percent, 100);
    }
    case 'reflection': {
      const prompts = (step.payload as any)?.prompts || [];
      if (prompts.length === 0) return 100;
      // Reflection now emits answer_submitted with { reflections: { promptId: value } }
      const completionEvent = stepInteractions.find(i => i.event_type === 'answer_submitted') 
        || stepInteractions.find(i => i.event_type === 'task_completed'); // fallback for legacy data
      if (!completionEvent) return 0;
      const reflections = completionEvent.event_payload?.reflections || completionEvent.event_payload || {};
      const answeredCount = Object.values(reflections).filter(v => !!(v as string)?.trim()).length;
      if (answeredCount === prompts.length) return 100;
      if (answeredCount > 0) return 80;
      return 0;
    }
    case 'plan_builder': {
      const sections = (step.payload as any)?.sections || [];
      if (sections.length === 0) return 100;
      // In PlanBuilderStep.tsx, onComplete only sends { acknowledged: true }
      const isCompleted = stepInteractions.some(i => i.event_type === 'task_completed');
      if (isCompleted) return 100;
      return stepInteractions.some(i => i.event_type === 'step_viewed') ? 50 : 0;
    }
    case 'essay_tasks': {
      const isViewed = stepInteractions.some(i => i.event_type === 'step_viewed');
      const tasks = (step.payload as any)?.tasks || [];
      if (tasks.length === 0) return isViewed ? 100 : 0;
      const completionEvent = stepInteractions.find(i => i.event_type === 'task_completed');
      const completedTasks = completionEvent?.event_payload?.completedTasks || {};
      const taskCount = Object.values(completedTasks).filter(v => !!v).length;
      const taskPercent = (taskCount / tasks.length) * 60;
      const readScore = isViewed ? 40 : 0;
      return readScore + taskPercent;
    }
    default:
      return stepInteractions.some(i => i.event_type === 'task_completed') ? 100 : 0;
  }
}

export async function computeExperienceScore(instanceId: string): Promise<{ totalScore: number; stepScores: { stepId: string; score: number }[] }> {
  const interactions = await getInteractionsByInstance(instanceId);
  const steps = await getExperienceSteps(instanceId);
  
  const stepScores = steps.map(step => ({
    stepId: step.id,
    score: computeStepScore(step, interactions)
  }));
  
  const totalScore = steps.length > 0 
    ? stepScores.reduce((acc, s) => acc + s.score, 0) / steps.length 
    : 0;
    
  return { totalScore, stepScores };
}

export function shouldProgessToNext(score: number, threshold = 60): boolean {
  return score >= threshold;
}

export async function computeFrictionLevel(instanceId: string): Promise<'low' | 'medium' | 'high' | null> {
  const interactions = await getInteractionsByInstance(instanceId);
  if (interactions.length === 0) return null;
  
  const stepIds = new Set(interactions.filter(i => !!i.step_id).map(i => i.step_id));
  const totalStepsEngaged = stepIds.size;
  const skipEvents = interactions.filter(i => i.event_type === 'step_skipped');
  
  // High skip rate (>50% step_skipped events)
  if (totalStepsEngaged > 0 && skipEvents.length / totalStepsEngaged > 0.5) {
    return 'high';
  }
  
  // Mid-step abandonment (viewed but no completion after 48h)
  const views = interactions.filter(i => i.event_type === 'step_viewed');
  const completions = interactions.filter(i => i.event_type === 'task_completed');
  const completedStepIds = new Set(completions.map(c => c.step_id));
  
  const abandoned = views.some(v => {
    if (completedStepIds.has(v.step_id)) return false;
    const viewTime = new Date(v.created_at).getTime();
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    return viewTime < fortyEightHoursAgo;
  });
  
  if (abandoned) return 'medium';
  
  // Long dwell + eventual completion
  const isExperienceCompleted = interactions.some(i => i.event_type === 'experience_completed');
  if (isExperienceCompleted) {
    const sorted = [...interactions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (let i = 1; i < sorted.length; i++) {
      const gap = new Date(sorted[i].created_at).getTime() - new Date(sorted[i-1].created_at).getTime();
      if (gap > 5 * 60 * 1000) { // > 5 minutes dwell
        return 'low'; // This actually means the user is taking their time, which we classify as low friction (high engagement)
      }
    }
  }
  
  return 'low';
}

export async function updateInstanceFriction(instanceId: string): Promise<void> {
  const frictionLevel = await computeFrictionLevel(instanceId);
  if (frictionLevel) {
    await updateExperienceInstance(instanceId, { friction_level: frictionLevel });
  }
}

```

### lib/experience/progression-rules.ts

```typescript
import { ProgressionRule } from '@/types/graph';
import { ResolutionDepth } from '@/lib/constants';

/**
 * PROGRESSION_RULES: The canonical chain map.
 * Defines how experiences lead to each other.
 */
export const PROGRESSION_RULES: ProgressionRule[] = [
  { 
    fromClass: 'questionnaire', 
    toClass: 'plan_builder', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Structure your answers into action' 
  },
  { 
    fromClass: 'questionnaire', 
    toClass: 'challenge', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Put your thinking into practice' 
  },
  { 
    fromClass: 'lesson', 
    toClass: 'challenge', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Apply what you learned' 
  },
  { 
    fromClass: 'lesson', 
    toClass: 'reflection', 
    condition: 'completion', 
    resolutionEscalation: false, 
    reason: 'Reflect on what you absorbed' 
  },
  { 
    fromClass: 'plan_builder', 
    toClass: 'challenge', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Execute your plan' 
  },
  { 
    fromClass: 'challenge', 
    toClass: 'reflection', 
    condition: 'completion', 
    resolutionEscalation: false, 
    reason: 'Process the challenge' 
  },
  { 
    fromClass: 'reflection', 
    toClass: 'questionnaire', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Weekly loop — check in again' 
  },
  { 
    fromClass: 'essay_tasks', 
    toClass: 'reflection', 
    condition: 'completion', 
    resolutionEscalation: false, 
    reason: 'Synthesize your reading' 
  },
];

/**
 * Returns suggested progression rules for a given experience class.
 */
export function getProgressionSuggestions(fromClass: string): ProgressionRule[] {
  return PROGRESSION_RULES.filter(rule => rule.fromClass === fromClass);
}

/**
 * Determines if the resolution should be escalated based on the rule.
 */
export function shouldEscalateResolution(rule: ProgressionRule, currentDepth: ResolutionDepth): ResolutionDepth {
  if (!rule.resolutionEscalation) return currentDepth;
  
  if (currentDepth === 'light') return 'medium';
  if (currentDepth === 'medium') return 'heavy';
  return 'heavy';
}

```

### lib/experience/reentry-engine.ts

```typescript
import { getExperienceInstances } from '@/lib/services/experience-service'
import { getInteractionsByInstance } from '@/lib/services/interaction-service'

export interface ActiveReentryPrompt {
  instanceId: string;
  instanceTitle: string;
  prompt: string;
  trigger: string;
  contextScope: string;
}

export async function evaluateReentryContracts(userId: string): Promise<ActiveReentryPrompt[]> {
  const experiences = await getExperienceInstances({ userId })
  const prompts: ActiveReentryPrompt[] = []

  const now = new Date()
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  for (const exp of experiences) {
    if (!exp.reentry) continue

    // Completion trigger: status = 'completed'
    if (exp.reentry.trigger === 'completion' && exp.status === 'completed') {
      prompts.push({
        instanceId: exp.id,
        instanceTitle: exp.title,
        prompt: exp.reentry.prompt,
        trigger: 'completion',
        contextScope: exp.reentry.contextScope
      })
    }

    // Inactivity trigger: status = 'active' and no interactions in 48h
    if (exp.reentry.trigger === 'inactivity' && exp.status === 'active') {
      const interactions = await getInteractionsByInstance(exp.id)
      const lastInteraction = interactions.length > 0
        ? interactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null

      const lastInteractionTime = lastInteraction ? new Date(lastInteraction.created_at) : new Date(exp.created_at)

      if (lastInteractionTime < fortyEightHoursAgo) {
        prompts.push({
          instanceId: exp.id,
          instanceTitle: exp.title,
          prompt: exp.reentry.prompt,
          trigger: 'inactivity',
          contextScope: exp.reentry.contextScope
        })
      }
    }
  }

  return prompts
}

```

### lib/experience/renderer-registry.tsx

```tsx
import React from 'react';
import type { ExperienceStep } from '@/types/experience';

export type StepRenderer = React.ComponentType<{
  step: ExperienceStep;
  onComplete: (payload?: unknown) => void;
  onSkip: () => void;
  onDraft?: (draft: Record<string, any>) => void;
}>;

const registry: Record<string, StepRenderer> = {};

export function registerRenderer(stepType: string, component: StepRenderer) {
  registry[stepType] = component;
}

export function getRenderer(stepType: string): StepRenderer {
  return registry[stepType] || FallbackStep;
}

function FallbackStep({ step }: { step: ExperienceStep }) {
  return (
    <div className="p-6 border border-[#1e1e2e] rounded-xl bg-[#12121a]">
      <h3 className="text-xl font-bold text-red-400 mb-2">Unsupported Step Type</h3>
      <p className="text-[#94a3b8]">The step type <code className="text-indigo-300">&quot;{step.step_type}&quot;</code> is not registered in the system.</p>
    </div>
  );
}

```

### lib/experience/step-scheduling.ts

```typescript
import { ExperienceStep } from '@/types/experience';

/**
 * Assigns a schedule to a list of steps based on a start date and pacing mode.
 * 
 * - daily: One step per day starting from startDate
 * - weekly: Monday-Friday scheduling, skipping weekends
 * - custom: Pack steps into ~60min sessions using estimated_minutes
 * 
 * Returns steps with scheduled_date and due_date populated.
 * (v1 implementation: due_date is set same as scheduled_date)
 * 
 * @evolving - v1.1
 */
export function assignSchedule(
  steps: ExperienceStep[],
  startDate: string,
  pacingMode: 'daily' | 'weekly' | 'custom'
): ExperienceStep[] {
  // Defensive copy to avoid mutating original objects if they are reused
  const result: ExperienceStep[] = steps.map(s => ({ ...s }));
  let currentDate = new Date(startDate);
  
  // Ensure we have a valid date
  if (isNaN(currentDate.getTime())) {
    currentDate = new Date();
  }
  
  let sessionMinutes = 0;

  for (let i = 0; i < result.length; i++) {
    const step = result[i];

    if (pacingMode === 'daily') {
      step.scheduled_date = currentDate.toISOString().split('T')[0];
      step.due_date = step.scheduled_date;
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (pacingMode === 'weekly') {
      // Skip weekends (0=Sun, 6=Sat)
      while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      step.scheduled_date = currentDate.toISOString().split('T')[0];
      step.due_date = step.scheduled_date;
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (pacingMode === 'custom') {
      const est = step.estimated_minutes || 15; // default 15 if null
      
      // If adding this step exceeds 60 min session, move to next day
      if (sessionMinutes > 0 && sessionMinutes + est > 60) {
        currentDate.setDate(currentDate.getDate() + 1);
        sessionMinutes = est;
      } else {
        sessionMinutes += est;
      }
      
      step.scheduled_date = currentDate.toISOString().split('T')[0];
      step.due_date = step.scheduled_date;
    }
  }

  return result;
}

/**
 * Filters steps scheduled for a specific date (YYYY-MM-DD).
 */
export function getStepsForDate(steps: ExperienceStep[], date: string): ExperienceStep[] {
  return steps.filter((s) => s.scheduled_date === date);
}

/**
 * Filters steps past due_date that aren't completed or skipped.
 * Uses lexicographical string comparison for YYYY-MM-DD.
 */
export function getOverdueSteps(steps: ExperienceStep[]): ExperienceStep[] {
  const today = new Date().toISOString().split('T')[0];
  return steps.filter((s) => {
    if (!s.due_date || s.status === 'completed' || s.status === 'skipped') return false;
    // Lexicographical comparison works for ISO dates
    return s.due_date < today;
  });
}

```

### lib/experience/step-state-machine.ts

```typescript
import { StepStatus } from '@/types/experience';

/**
 * Step Transition Actions
 * @evolving - v1.1
 */
export type StepTransitionAction = 'start' | 'complete' | 'skip' | 'reopen';

/**
 * Valid step transitions
 * pending -> in_progress (start)
 * pending -> skipped (skip)
 * in_progress -> completed (complete)
 * in_progress -> skipped (skip)
 * completed -> in_progress (reopen)
 * skipped -> in_progress (start)
 */
const STEP_TRANSITIONS: Record<StepStatus, { action: StepTransitionAction; to: StepStatus }[]> = {
  pending: [
    { action: 'start', to: 'in_progress' },
    { action: 'skip', to: 'skipped' },
  ],
  in_progress: [
    { action: 'complete', to: 'completed' },
    { action: 'skip', to: 'skipped' },
  ],
  completed: [
    { action: 'reopen', to: 'in_progress' },
  ],
  skipped: [
    { action: 'start', to: 'in_progress' },
  ],
};

/**
 * Checks if a step can transition from its current status via a given action.
 */
export function canTransitionStep(current: StepStatus, action: StepTransitionAction): boolean {
  const possible = STEP_TRANSITIONS[current];
  return possible?.some((t) => t.action === action) ?? false;
}

/**
 * Returns the next status for a step based on its current status and an action.
 * Returns null if the transition is invalid.
 */
export function getNextStepStatus(current: StepStatus, action: StepTransitionAction): StepStatus | null {
  const possible = STEP_TRANSITIONS[current];
  const transition = possible?.find((t) => t.action === action);
  return transition ? transition.to : null;
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
    idea_deferred: 'Idea put on hold',
    drill_completed: 'Drill completed',
    project_promoted: 'Project promoted',
    task_created: 'Task created',
    pr_opened: 'PR opened',
    preview_ready: 'Preview ready',
    build_failed: 'Build failed',
    merge_completed: 'Merge completed',
    project_shipped: 'Project shipped',
    project_killed: 'Project killed',
    changes_requested: 'Changes requested',
    // GitHub lifecycle events
    github_issue_created: 'GitHub issue created',
    github_issue_closed: 'GitHub issue closed',
    github_workflow_dispatched: 'Workflow dispatched',
    github_workflow_failed: 'Workflow failed',
    github_workflow_succeeded: 'Workflow succeeded',
    github_pr_opened: 'GitHub PR opened',
    github_pr_merged: 'GitHub PR merged',
    github_review_requested: 'Review requested',
    github_changes_requested: 'Changes requested on GitHub',
    github_copilot_assigned: 'Copilot assigned',
    github_sync_failed: 'GitHub sync failed',
    github_connection_error: 'GitHub connection error',
    // Knowledge lifecycle events
    knowledge_ready: 'New knowledge ready',
    knowledge_updated: 'Knowledge updated',
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

### lib/github/client.ts

```typescript
import { Octokit } from '@octokit/rest'

let _client: Octokit | null = null

/**
 * Returns the singleton Octokit client, initialised from GITHUB_TOKEN.
 * Throws if the token is not set.
 *
 * Future: this becomes the boundary for GitHub App auth.
 * export function getGitHubClientForInstallation(installationId: number): Octokit { ... }
 */
export function getGitHubClient(): Octokit {
  if (!_client) {
    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error('GITHUB_TOKEN is not set')
    _client = new Octokit({ auth: token })
  }
  return _client
}

```

### lib/github/handlers/handle-issue-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getProjects, updateProjectState } from '@/lib/services/projects-service'
import { createInboxEvent } from '@/lib/services/inbox-service'

export async function handleIssueEvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload } = ctx
  const issue = rawPayload.issue as any
  if (!issue) return

  const issueNumber = issue.number
  const projects = await getProjects()
  const project = projects.find((p) => p.githubIssueNumber === issueNumber)

  if (!project) {
    console.log(`[webhook/github] No local project found for issue #${issueNumber}`)
    return
  }

  console.log(`[webhook/github] Handling issue.${action} for project ${project.id}`)

  switch (action) {
    case 'opened':
    case 'reopened':
      // Status remains 'arena' or similar, but maybe log it
      await createInboxEvent({
        type: 'github_issue_created',
        title: `GitHub Issue #${issueNumber} ${action}`,
        body: `Issue "${issue.title}" was ${action} on GitHub.`,
        severity: 'info',
        projectId: project.id,
        actionUrl: `/arena/${project.id}`
      })
      break

    case 'closed':
      // If we use issue closure as a signal for project status, update it.
      // For now, just create an inbox event.
      await createInboxEvent({
        type: 'project_shipped', // mapped loosely
        title: `GitHub Issue #${issueNumber} closed`,
        body: `The linked issue for "${project.name}" was closed.`,
        severity: 'success',
        projectId: project.id
      })
      break

    case 'assigned':
      const assignee = (rawPayload.assignee as any)?.login
      if (assignee) {
        await createInboxEvent({
          type: 'github_copilot_assigned',
          title: 'Developer assigned',
          body: `${assignee} was assigned to issue #${issueNumber}.`,
          severity: 'info',
          projectId: project.id
        })
      }
      break

    default:
      console.log(`[webhook/github] Action ${action} for issue ${issueNumber} not specifically handled.`)
  }
}

```

### lib/github/handlers/handle-pr-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getProjects } from '@/lib/services/projects-service'
import { createPR, updatePR, getPRsForProject } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { PullRequest } from '@/types/pr'
import type { InboxEventType } from '@/types/inbox'

export async function handlePREvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload, repositoryFullName } = ctx
  const pr = rawPayload.pull_request as any
  if (!pr) return

  console.log(`[webhook/github] Handling pull_request.${action} for PR #${pr.number} in ${repositoryFullName}`)

  // Search for the project this PR belongs to
  const projects = await getProjects()
  
  // Try to find the project by repo name first.
  // Then try to refine by looking for the issue number in the PR body (e.g., "Fixes #123")
  const repoProjects = projects.filter(
    (p) => 
      (p.githubRepoFullName === repositoryFullName) || 
      (p.githubRepo && repositoryFullName.endsWith(p.githubRepo))
  )

  let project = repoProjects.find(p => {
    const issueNumStr = p.githubIssueNumber?.toString()
    return pr.body?.includes(`#${issueNumStr}`) || pr.title?.includes(`#${issueNumStr}`)
  })
  
  // Fallback: if there's only one active project in the repo, assume it's that one
  if (!project && repoProjects.length === 1) {
    project = repoProjects[0]
  }

  if (!project) {
    console.log(`[webhook/github] PR #${pr.number} could not be accurately linked to a local project.`)
    return
  }

  const existingPRs = await getPRsForProject(project.id)
  const existingPR = existingPRs.find((p: PullRequest) => p.number === pr.number)

  switch (action) {
    case 'opened':
    case 'reopened':
    case 'ready_for_review':
      if (existingPR) {
        await updatePR(existingPR.id, {
          status: pr.state === 'open' ? 'open' : (pr.merged ? 'merged' : 'closed'),
          title: pr.title,
          branch: pr.head.ref,
          author: pr.user.login,
          mergeable: pr.mergeable ?? true,
        })
      } else {
        const newPR = await createPR({
          projectId: project.id,
          title: pr.title,
          branch: pr.head.ref,
          status: 'open',
          author: pr.user.login,
          buildState: 'pending',
          mergeable: pr.mergeable ?? true,
          previewUrl: '', // To be updated by deployment webhooks
        })
        await updatePR(newPR.id, { number: pr.number })
      }

      await createInboxEvent({
        type: 'github_pr_opened' as InboxEventType,
        title: `PR #${pr.number} ${action}`,
        body: `New pull request "${pr.title}" for project "${project.name}".`,
        severity: 'info',
        projectId: project.id,
        actionUrl: `/review/${pr.number}` // Or however the review page is keyed
      })
      break

    case 'closed':
      if (existingPR) {
        const isMerged = pr.merged === true
        await updatePR(existingPR.id, {
          status: isMerged ? 'merged' : 'closed',
          mergeable: false,
        })

        await createInboxEvent({
          type: isMerged ? 'github_pr_merged' : 'project_killed',
          title: `PR #${pr.number} ${isMerged ? 'merged' : 'closed'}`,
          body: `Pull request "${pr.title}" was ${isMerged ? 'merged' : 'closed without merging'}.`,
          severity: isMerged ? 'success' : 'warning',
          projectId: project.id
        })
      }
      break

    case 'synchronize':
      if (existingPR) {
        await updatePR(existingPR.id, {
          buildState: 'running', // Assume a new build starts on synchronize
        })
      }
      break

    default:
      console.log(`[webhook/github] PR action ${action} not explicitly handled.`)
  }
}

```

### lib/github/handlers/handle-pr-review-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getPRsForProject } from '@/lib/services/prs-service'
import { updatePR } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { getProjects } from '@/lib/services/projects-service'
import type { ReviewStatus } from '@/types/pr'

export async function handlePRReviewEvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload } = ctx
  const pr = rawPayload.pull_request as any
  const review = rawPayload.review as any
  if (!pr || !review) return

  const prNumber = pr.number
  console.log(`[webhook/github] Handling pull_request_review.${action} for PR #${prNumber}`)

  // Find local PR by number — search across all projects
  const projects = await getProjects()
  let localPR = null
  for (const project of projects) {
    const prs = await getPRsForProject(project.id)
    const found = prs.find((p) => p.number === prNumber)
    if (found) { localPR = found; break }
  }

  if (!localPR) {
    console.log(`[webhook/github] No local PR found for number ${prNumber}`)
    return
  }

  switch (action) {
    case 'submitted':
      const reviewState = review.state.toLowerCase()
      let reviewStatus: ReviewStatus = 'pending'
      let eventType: 'github_pr_opened' | 'github_changes_requested' | 'github_review_requested' = 'github_review_requested'

      if (reviewState === 'approved') {
        reviewStatus = 'approved'
      } else if (reviewState === 'changes_requested') {
        reviewStatus = 'changes_requested'
        eventType = 'github_changes_requested'
      } else {
        console.log(`[webhook/github] Review state ${reviewState} for PR #${prNumber} logged but status unchanged.`)
      }

      if (reviewStatus !== 'pending') {
        await updatePR(localPR.id, { reviewStatus })
        
        await createInboxEvent({
          type: eventType as any,
          title: `Review ${reviewState}: PR #${prNumber}`,
          body: `Reviewer ${review.user.login} submitted review state "${reviewState}".`,
          severity: reviewState === 'approved' ? 'success' : 'warning',
          projectId: localPR.projectId,
          actionUrl: review.html_url
        })
      }
      break

    case 'dismissed':
      await updatePR(localPR.id, { reviewStatus: 'pending' })
      break

    default:
      console.log(`[webhook/github] Review action ${action} not explicitly handled.`)
  }
}

```

### lib/github/handlers/handle-workflow-run-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getAgentRun, setAgentRunStatus } from '@/lib/services/agent-runs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { getStorageAdapter } from '@/lib/storage-adapter'
import type { AgentRun } from '@/types/agent-run'

export async function handleWorkflowRunEvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload } = ctx
  const workflowRun = rawPayload.workflow_run as any
  if (!workflowRun) return

  const githubWorkflowRunId = workflowRun.id.toString()
  console.log(`[webhook/github] Handling workflow_run.${action} for ID ${githubWorkflowRunId}`)

  // Find the agent run by GitHub workflow run ID
  const adapter = getStorageAdapter()
  const agentRuns = await adapter.getCollection<AgentRun>('agentRuns')
  const agentRun = agentRuns.find((r) => r.githubWorkflowRunId === githubWorkflowRunId)

  if (!agentRun) {
    console.log(`[webhook/github] No local agent run found for workflow ID ${githubWorkflowRunId}`)
    return
  }

  switch (action) {
    case 'requested':
    case 'in_progress':
      await setAgentRunStatus(agentRun.id, 'running')
      break

    case 'completed':
      const conclusion = workflowRun.conclusion
      const status = conclusion === 'success' ? 'succeeded' : 'failed'
      
      await setAgentRunStatus(agentRun.id, status, {
        summary: `GitHub workflow ${conclusion}: ${workflowRun.html_url}`,
        error: conclusion === 'failure' ? 'Workflow run failed on GitHub.' : undefined
      })

      await createInboxEvent({
        type: conclusion === 'success' ? 'github_workflow_succeeded' : 'github_workflow_failed',
        title: `Workflow ${conclusion}`,
        body: `Mira execution for project "${agentRun.projectId}" ${conclusion}.`,
        severity: conclusion === 'success' ? 'success' : 'error',
        projectId: agentRun.projectId,
        actionUrl: workflowRun.html_url
      })
      break

    default:
      console.log(`[webhook/github] Workflow run action ${action} not specifically handled.`)
  }
}

```

### lib/github/handlers/index.ts

```typescript
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

### lib/github/signature.ts

```typescript
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

### lib/guards.ts

```typescript
import type { Idea } from '@/types/idea'
import type { Project } from '@/types/project'
import type { ExperienceInstance, Resolution } from '@/types/experience'
import {
  RESOLUTION_DEPTHS,
  RESOLUTION_MODES,
  RESOLUTION_TIME_SCOPES,
  RESOLUTION_INTENSITIES,
  MASTERY_STATUSES,
} from '@/lib/constants'
import type { KnowledgeUnit, MasteryStatus } from '@/types/knowledge'

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

export function isExperienceInstance(value: unknown): value is ExperienceInstance {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'instance_type' in value &&
    'status' in value &&
    'resolution' in value
  )
}

export function isEphemeralExperience(instance: ExperienceInstance): boolean {
  return instance.instance_type === 'ephemeral'
}

export function isPersistentExperience(instance: ExperienceInstance): boolean {
  return instance.instance_type === 'persistent'
}

export function isValidResolution(obj: unknown): obj is Resolution {
  if (typeof obj !== 'object' || obj === null) return false

  const res = obj as Record<string, unknown>
  return (
    RESOLUTION_DEPTHS.includes(res.depth as any) &&
    RESOLUTION_MODES.includes(res.mode as any) &&
    RESOLUTION_TIME_SCOPES.includes(res.timeScope as any) &&
    RESOLUTION_INTENSITIES.includes(res.intensity as any)
  )
}

export function isKnowledgeUnit(val: unknown): val is KnowledgeUnit {
  return (
    typeof val === 'object' &&
    val !== null &&
    'id' in val &&
    'topic' in val &&
    'domain' in val &&
    'unit_type' in val &&
    'mastery_status' in val
  )
}

export function isValidMasteryStatus(val: unknown): val is MasteryStatus {
  return typeof val === 'string' && MASTERY_STATUSES.includes(val as any)
}

```

### lib/hooks/useDraftPersistence.ts

```typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_USER_ID } from '@/lib/constants';

export interface DraftContext {
  drafts: Record<string, Record<string, any>>;
  saveDraft: (stepId: string, content: Record<string, any>) => void;
  getDraft: (stepId: string) => Record<string, any> | null;
  isLoading: boolean;
  lastSaved: Record<string, string>;
}

/**
 * Hook to manage step-level draft persistence with auto-save and hydration.
 */
export function useDraftPersistence(instanceId: string): DraftContext {
  const [drafts, setDrafts] = useState<Record<string, Record<string, any>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Record<string, string>>({});
  
  // Refs for debouncing
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingChanges = useRef<Record<string, Record<string, any>>>({});

  // 1. Initial hydration on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadDrafts = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/drafts?instanceId=${instanceId}`);
        if (!res.ok) throw new Error('Failed to load drafts');
        
        const { data } = await res.json();
        
        if (isMounted && data) {
          setDrafts(data);
          
          // Initialize lastSaved from loaded data if we had timestamps (though they're not in the GET /api/drafts response yet)
          // For now we'll just leave them empty until a save happens
        }
      } catch (err) {
        console.error('[useDraftPersistence] Load failed:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDrafts();
    
    return () => {
      isMounted = false;
      // Cleanup timers on unmount
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, [instanceId]);

  // 2. Save function with debounce
  const saveDraft = useCallback((stepId: string, content: Record<string, any>) => {
    // Update local state immediately for UI responsiveness
    setDrafts(prev => ({
      ...prev,
      [stepId]: content
    }));

    // Store pending change
    pendingChanges.current[stepId] = content;

    // Clear existing timer for this step
    if (debounceTimers.current[stepId]) {
      clearTimeout(debounceTimers.current[stepId]);
    }

    // Set new timer
    debounceTimers.current[stepId] = setTimeout(async () => {
      const contentToSave = pendingChanges.current[stepId];
      if (!contentToSave) return;

      try {
        const res = await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instanceId,
            stepId,
            userId: DEFAULT_USER_ID,
            content: contentToSave
          })
        });

        if (res.ok) {
          setLastSaved(prev => ({
            ...prev,
            [stepId]: new Date().toISOString()
          }));
          delete pendingChanges.current[stepId];
        } else {
          console.error(`[useDraftPersistence] Save failed for step ${stepId}`);
        }
      } catch (err) {
        console.error(`[useDraftPersistence] Save failed for step ${stepId}:`, err);
      }
    }, 500);
  }, [instanceId]);

  // 3. Getter function
  const getDraft = useCallback((stepId: string) => {
    return drafts[stepId] || null;
  }, [drafts]);

  return {
    drafts,
    saveDraft,
    getDraft,
    isLoading,
    lastSaved
  };
}

```

### lib/hooks/useInteractionCapture.ts

```typescript
'use client';

import { useRef } from 'react';
import { INTERACTION_EVENTS, buildInteractionPayload, type InteractionEventType } from '@/lib/experience/interaction-events';

/**
 * useInteractionCapture - A pure client-side hook for experience telemetry.
 * All methods are fire-and-forget, non-blocking, and do not track state.
 */
export function useInteractionCapture(instanceId: string) {
  const stepTimers = useRef<Record<string, number>>({});
  
  const postEvent = (eventType: InteractionEventType, stepId?: string, payload: Record<string, any> = {}) => {
    // Fire and forget
    const data = buildInteractionPayload(eventType, instanceId, stepId, payload);
    
    fetch('/api/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }).catch((err) => {
      // Quietly log errors to console without interrupting the UI
      console.warn(`[InteractionCapture] Failed to record ${eventType}:`, err);
    });
  };

  const trackStepView = (stepId: string) => {
    postEvent(INTERACTION_EVENTS.STEP_VIEWED, stepId);
  };

  const trackAnswer = (stepId: string, answers: Record<string, any>) => {
    postEvent(INTERACTION_EVENTS.ANSWER_SUBMITTED, stepId, answers);
  };

  const trackSkip = (stepId: string) => {
    postEvent(INTERACTION_EVENTS.STEP_SKIPPED, stepId);
  };

  const trackComplete = (stepId: string, payload?: Record<string, any>) => {
    postEvent(INTERACTION_EVENTS.TASK_COMPLETED, stepId, payload);
  };

  const trackExperienceStart = () => {
    postEvent(INTERACTION_EVENTS.EXPERIENCE_STARTED);
  };

  const trackExperienceComplete = () => {
    postEvent(INTERACTION_EVENTS.EXPERIENCE_COMPLETED);
  };

  const trackDraft = (stepId: string, draft: Record<string, any>) => {
    postEvent(INTERACTION_EVENTS.DRAFT_SAVED, stepId, draft);
  };

  const startStepTimer = (stepId: string) => {
    stepTimers.current[stepId] = Date.now();
  };

  const endStepTimer = (stepId: string) => {
    const startTime = stepTimers.current[stepId];
    if (startTime) {
      const durationMs = Date.now() - startTime;
      postEvent(INTERACTION_EVENTS.TIME_ON_STEP, stepId, { durationMs });
      // Reset after capture
      delete stepTimers.current[stepId];
    }
  };

  return {
    trackStepView,
    trackAnswer,
    trackSkip,
    trackComplete,
    trackExperienceStart,
    trackExperienceComplete,
    trackDraft,
    startStepTimer,
    endStepTimer,
  };
}

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
  devGptSend: '/dev/gpt-send',
  // GitHub pages + API routes
  githubPlayground: '/dev/github-playground',
  githubTestConnection: '/api/github/test-connection',
  githubCreateIssue: '/api/github/create-issue',
  githubDispatchWorkflow: '/api/github/dispatch-workflow',
  githubCreatePR: '/api/github/create-pr',
  githubSyncPR: '/api/github/sync-pr',
  githubMergePR: '/api/github/merge-pr',
  githubTriggerAgent: '/api/github/trigger-agent',

  // --- Sprint 3: Experience Engine ---
  workspace: (id: string) => `/workspace/${id}`,
  library: '/library',
  timeline: '/timeline',
  profile: '/profile',

  // --- Sprint 8: Knowledge Tab ---
  knowledge: '/knowledge',
  knowledgeUnit: (id: string) => `/knowledge/${id}`,
} as const

```

### lib/seed-data.ts

```typescript
import type { StudioStore } from './storage'

export function getSeedData(): StudioStore {
  return {
    ideas: [
      {
        id: 'idea-001',
        title: 'AI-powered code review assistant',
        raw_prompt: 'What if we had a tool that could automatically review PRs and suggest improvements based on team coding standards?',
        gpt_summary: 'A GitHub-integrated tool that analyzes pull requests against defined coding standards and provides actionable feedback.',
        vibe: 'productivity',
        audience: 'engineering teams',
        intent: 'Reduce code review bottlenecks and maintain code quality at scale.',
        created_at: '2026-03-22T00:13:00.000Z',
        status: 'captured',
      },
      {
        id: 'idea-002',
        title: 'Team onboarding checklist builder',
        raw_prompt: 'Build something to help companies create interactive onboarding flows for new hires',
        gpt_summary: 'A tool for building structured, trackable onboarding checklists with progress visibility for managers and new hires.',
        vibe: 'operations',
        audience: 'HR teams and new employees',
        intent: 'Cut onboarding time and reduce "what do I do next" anxiety.',
        created_at: '2026-03-20T00:43:00.000Z',
        status: 'icebox',
      },
    ],
    drillSessions: [
      {
        id: 'drill-001',
        ideaId: 'idea-001',
        intent: 'Reduce code review bottlenecks and maintain code quality at scale.',
        successMetric: 'PR review time drops by 40% in first month',
        scope: 'medium',
        executionPath: 'assisted',
        urgencyDecision: 'now',
        finalDisposition: 'arena',
        completedAt: '2026-03-22T00:23:00.000Z',
      },
    ],
    projects: [
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
        createdAt: '2026-03-19T00:43:00.000Z',
        updatedAt: '2026-03-21T22:43:00.000Z',
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
        createdAt: '2026-03-15T00:43:00.000Z',
        updatedAt: '2026-03-21T00:43:00.000Z',
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
        createdAt: '2026-02-20T00:43:00.000Z',
        updatedAt: '2026-03-17T00:43:00.000Z',
        shippedAt: '2026-03-17T00:43:00.000Z',
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
        createdAt: '2026-02-05T00:43:00.000Z',
        updatedAt: '2026-03-12T00:43:00.000Z',
        killedAt: '2026-03-12T00:43:00.000Z',
        killedReason: 'Scope too large for current team. Web-first is the right call.',
      },
    ],
    tasks: [
      {
        id: 'task-001',
        projectId: 'proj-001',
        title: 'Implement drill tunnel flow',
        status: 'in_progress',
        priority: 'high',
        createdAt: '2026-03-21T00:43:00.000Z',
      },
      {
        id: 'task-002',
        projectId: 'proj-001',
        title: 'Build arena project card',
        status: 'done',
        priority: 'high',
        linkedPrId: 'pr-001',
        createdAt: '2026-03-20T12:43:00.000Z',
      },
      {
        id: 'task-003',
        projectId: 'proj-001',
        title: 'Wire API routes to mock data',
        status: 'pending',
        priority: 'medium',
        createdAt: '2026-03-21T12:43:00.000Z',
      },
      {
        id: 'task-004',
        projectId: 'proj-002',
        title: 'Fix webhook signature validation',
        status: 'blocked',
        priority: 'high',
        createdAt: '2026-03-21T18:43:00.000Z',
      },
    ],
    prs: [
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
        createdAt: '2026-03-21T00:43:00.000Z',
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
        createdAt: '2026-03-21T22:43:00.000Z',
      },
    ],
    inbox: [
      {
        id: 'evt-001',
        type: 'idea_captured',
        title: 'New idea arrived',
        body: 'AI-powered code review assistant — ready for drill.',
        timestamp: '2026-03-22T00:13:00.000Z',
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
        timestamp: '2026-03-21T22:43:00.000Z',
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
        timestamp: '2026-03-21T00:43:00.000Z',
        severity: 'error',
        actionUrl: '/arena/proj-002',
        read: false,
      },
    ],
    // Sprint 2: new collections (start empty)
    agentRuns: [],
    externalRefs: [],
  }
}

```

### lib/services/agent-runs-service.ts

```typescript
/**
 * lib/services/agent-runs-service.ts
 * CRUD service for AgentRun entities — tracks GitHub workflow / Copilot runs.
 * All reads/writes go through the storage adapter (SOP-6 + SOP-9).
 */

import type { AgentRun, AgentRunKind, AgentRunStatus } from '@/types/agent-run'
import type { ExecutionMode } from '@/lib/constants'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

type CreateAgentRunInput = {
  projectId: string
  taskId?: string
  kind: AgentRunKind
  executionMode: ExecutionMode
  triggeredBy: string
  githubWorkflowRunId?: string
  githubIssueNumber?: number
}

/** Create and persist a new AgentRun. Returns the created record. */
export async function createAgentRun(data: CreateAgentRunInput): Promise<AgentRun> {
  const adapter = getStorageAdapter()
  const run: AgentRun = {
    id: generateId(),
    status: 'queued',
    startedAt: new Date().toISOString(),
    ...data,
  }
  return adapter.saveItem<AgentRun>('agentRuns', run)
}

/** Retrieve a single AgentRun by its ID. Returns undefined if not found. */
export async function getAgentRun(id: string): Promise<AgentRun | undefined> {
  const adapter = getStorageAdapter()
  const runs = await adapter.getCollection<AgentRun>('agentRuns')
  return runs.find((r) => r.id === id)
}

/** All AgentRuns for a given project, sorted by startedAt descending. */
export async function getAgentRunsForProject(projectId: string): Promise<AgentRun[]> {
  const adapter = getStorageAdapter()
  const runs = await adapter.getCollection<AgentRun>('agentRuns')
  return runs
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

/** Partial-update an AgentRun by ID. Merges supplied fields into the record. */
export async function updateAgentRun(
  id: string,
  updates: Partial<Omit<AgentRun, 'id' | 'projectId'>>
): Promise<AgentRun | undefined> {
  const adapter = getStorageAdapter()
  try {
    return await adapter.updateItem<AgentRun>('agentRuns', id, updates)
  } catch {
    return undefined
  }
}

/** Convenience: the most recently started run for a project. */
export async function getLatestRunForProject(projectId: string): Promise<AgentRun | undefined> {
  const runs = await getAgentRunsForProject(projectId)
  return runs[0]
}

/** Update just the status field (and optionally finishedAt) atomically. */
export async function setAgentRunStatus(
  id: string,
  status: AgentRunStatus,
  opts?: { summary?: string; error?: string }
): Promise<AgentRun | undefined> {
  const finishedAt =
    status === 'succeeded' || status === 'failed'
      ? new Date().toISOString()
      : undefined
  return updateAgentRun(id, { status, finishedAt, ...opts })
}

```

### lib/services/draft-service.ts

```typescript
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'
import { Artifact } from '@/types/interaction'

export interface DraftMetadata {
  step_id: string
  instance_id: string
  saved_at: string
}

/**
 * Service for managing step-level work-in-progress drafts.
 * Drafts are stored in the artifacts table with artifact_type = 'step_draft'.
 */
export async function saveDraft(instanceId: string, stepId: string, userId: string, content: Record<string, any>): Promise<void> {
  const adapter = getStorageAdapter()
  
  // 1. Fetch existing drafts for this instance to find a match
  const artifacts = await adapter.query<Artifact>('artifacts', { 
    instance_id: instanceId,
    artifact_type: 'step_draft'
  })
  
  const existingArtifact = artifacts.find(a => a.metadata?.step_id === stepId)
  
  const metadata: DraftMetadata = {
    step_id: stepId,
    instance_id: instanceId,
    saved_at: new Date().toISOString()
  }
  
  const contentStr = JSON.stringify(content)
  
  if (existingArtifact) {
    // 2. Update existing draft
    await adapter.updateItem<Artifact>('artifacts', existingArtifact.id, {
      content: contentStr,
      metadata
    })
  } else {
    // 3. Create new draft
    const newArtifact: Omit<Artifact, 'id'> = {
      instance_id: instanceId,
      artifact_type: 'step_draft',
      title: `Draft for step ${stepId}`,
      content: contentStr,
      metadata
    }
    await adapter.saveItem<Artifact>('artifacts', {
      ...newArtifact,
      id: generateId()
    } as Artifact)
  }
}

export async function getDraft(instanceId: string, stepId: string): Promise<Record<string, any> | null> {
  const adapter = getStorageAdapter()
  
  const artifacts = await adapter.query<Artifact>('artifacts', { 
    instance_id: instanceId,
    artifact_type: 'step_draft'
  })
  
  const artifact = artifacts.find(a => a.metadata?.step_id === stepId)
  
  if (!artifact) return null
  
  try {
    return JSON.parse(artifact.content)
  } catch (e) {
    console.error('[DraftService] Failed to parse draft content:', e)
    return null
  }
}

export async function getDraftsForInstance(instanceId: string): Promise<Record<string, Record<string, any>>> {
  const adapter = getStorageAdapter()
  
  const artifacts = await adapter.query<Artifact>('artifacts', { 
    instance_id: instanceId,
    artifact_type: 'step_draft'
  })
  
  const drafts: Record<string, Record<string, any>> = {}
  
  for (const artifact of artifacts) {
    const stepId = artifact.metadata?.step_id
    if (stepId) {
      try {
        drafts[stepId] = JSON.parse(artifact.content)
      } catch (e) {
        console.warn(`[DraftService] Failed to parse draft content for step ${stepId}:`, e)
      }
    }
  }
  
  return drafts
}

export async function deleteDraft(instanceId: string, stepId: string): Promise<void> {
  const adapter = getStorageAdapter()
  
  const artifacts = await adapter.query<Artifact>('artifacts', { 
    instance_id: instanceId,
    artifact_type: 'step_draft'
  })
  
  const artifact = artifacts.find(a => a.metadata?.step_id === stepId)
  
  if (artifact) {
    await adapter.deleteItem('artifacts', artifact.id)
  }
}

```

### lib/services/drill-service.ts

```typescript
import type { DrillSession } from '@/types/drill'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

export async function getDrillSessionByIdeaId(ideaId: string): Promise<DrillSession | undefined> {
  const adapter = getStorageAdapter()
  const sessions = await adapter.getCollection<DrillSession>('drillSessions')
  return sessions.find((s) => s.ideaId === ideaId)
}

export async function saveDrillSession(data: Omit<DrillSession, 'id'>): Promise<DrillSession> {
  const adapter = getStorageAdapter()
  const session: DrillSession = {
    ...data,
    id: generateId(),
    completedAt: data.completedAt ?? new Date().toISOString(),
  }
  return adapter.saveItem<DrillSession>('drillSessions', session)
}

```

### lib/services/experience-service.ts

```typescript
import { ExperienceInstance, ExperienceStatus, InstanceType, ExperienceTemplate, ExperienceStep, ReentryContract } from '@/types/experience'
export type { ExperienceInstance, ExperienceStatus, InstanceType, ExperienceTemplate, ExperienceStep, ReentryContract } from '@/types/experience'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'
import { createSynthesisSnapshot } from './synthesis-service'
import { extractFacetsWithAI } from './facet-service'
import { updateInstanceFriction } from '@/lib/experience/progression-engine'

export async function getExperienceTemplates(): Promise<ExperienceTemplate[]> {
  const adapter = getStorageAdapter()
  return adapter.getCollection<ExperienceTemplate>('experience_templates')
}

export async function getExperienceInstances(filters?: { status?: ExperienceStatus; instanceType?: InstanceType; userId?: string }): Promise<ExperienceInstance[]> {
  const adapter = getStorageAdapter()
  if (filters) {
    const queryFilters: Record<string, any> = {}
    if (filters.status) queryFilters.status = filters.status
    if (filters.instanceType) queryFilters.instance_type = filters.instanceType
    if (filters.userId) queryFilters.user_id = filters.userId
    return adapter.query<ExperienceInstance>('experience_instances', queryFilters)
  }
  return adapter.getCollection<ExperienceInstance>('experience_instances')
}

export async function getExperienceInstanceById(id: string): Promise<(ExperienceInstance & { steps: ExperienceStep[] }) | null> {
  const adapter = getStorageAdapter()
  const instances = await adapter.query<ExperienceInstance>('experience_instances', { id })
  const instance = instances[0]
  if (!instance) return null

  const steps = await getExperienceSteps(id)
  return { ...instance, steps }
}

export async function createExperienceInstance(data: Omit<ExperienceInstance, 'id' | 'created_at'>): Promise<ExperienceInstance> {
  if (!data.resolution) {
    throw new Error('Resolution is required for creating an experience instance')
  }
  const adapter = getStorageAdapter()
  const instance: ExperienceInstance = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString()
  } as ExperienceInstance

  return adapter.saveItem<ExperienceInstance>('experience_instances', instance)
}

export async function updateExperienceInstance(id: string, updates: Partial<ExperienceInstance>): Promise<ExperienceInstance | null> {
  const adapter = getStorageAdapter()
  return adapter.updateItem<ExperienceInstance>('experience_instances', id, updates)
}

export async function getExperienceSteps(instanceId: string): Promise<ExperienceStep[]> {
  const adapter = getStorageAdapter()
  const steps = await adapter.query<ExperienceStep>('experience_steps', { instance_id: instanceId })
  return (steps as ExperienceStep[]).sort((a, b) => a.step_order - b.step_order)
}

export async function createExperienceStep(data: Omit<ExperienceStep, 'id'>): Promise<ExperienceStep> {
  const adapter = getStorageAdapter()
  const step: ExperienceStep = {
    ...data,
    id: generateId()
  } as ExperienceStep
  return adapter.saveItem<ExperienceStep>('experience_steps', step)
}

import { ExperienceTransitionAction, canTransitionExperience, getNextExperienceState } from '@/lib/state-machine'

export async function transitionExperienceStatus(id: string, action: ExperienceTransitionAction): Promise<ExperienceInstance | null> {
  const instance = await getExperienceInstanceById(id)
  if (!instance) return null

  if (!canTransitionExperience(instance.status, action)) {
    console.error(`Invalid experience transition from ${instance.status} with action ${action}`)
    return null
  }

  const nextStatus = getNextExperienceState(instance.status, action)
  if (!nextStatus) return null

  const updates: Partial<ExperienceInstance> = { status: nextStatus }

  if (action === 'publish') {
    updates.published_at = new Date().toISOString()
  }

  return updateExperienceInstance(id, updates)
}

export async function getActiveExperiences(userId: string): Promise<ExperienceInstance[]> {
  const experiences = await getExperienceInstances({ userId, instanceType: 'persistent' })
  return experiences.filter(exp => ['active', 'published'].includes(exp.status))
}

export async function getCompletedExperiences(userId: string): Promise<ExperienceInstance[]> {
  return getExperienceInstances({ userId, status: 'completed' })
}

export async function getEphemeralExperiences(userId: string): Promise<ExperienceInstance[]> {
  return getExperienceInstances({ userId, instanceType: 'ephemeral' })
}

export async function getProposedExperiences(userId: string): Promise<ExperienceInstance[]> {
  const experiences = await getExperienceInstances({ userId, instanceType: 'persistent' })
  return experiences.filter(exp => 
    ['proposed', 'drafted', 'ready_for_review', 'approved'].includes(exp.status)
  )
}

export async function getResumeStepIndex(instanceId: string): Promise<number> {
  const { getInteractionsByInstance } = await import('./interaction-service')
  const interactions = await getInteractionsByInstance(instanceId)
  
  // Find highest step_id from task_completed events
  const completions = interactions.filter(i => i.event_type === 'task_completed')
  if (completions.length === 0) return 0

  // Map back to step orders. step_id in interaction might be the UUID.
  // We need to fetch steps to map UUID -> order.
  const steps = await getExperienceSteps(instanceId)
  const completedStepIds = new Set(completions.map(c => c.step_id))
  
  let highestOrder = -1
  for (const step of steps) {
    if (completedStepIds.has(step.id)) {
      highestOrder = Math.max(highestOrder, step.step_order)
    }
  }

  return Math.min(highestOrder + 1, steps.length - 1)
}

/**
 * Batch creation of experience steps.
 * Assigns IDs and inserts all in one go (adapter-dependent).
 */
export async function createExperienceSteps(steps: Omit<ExperienceStep, 'id'>[]): Promise<ExperienceStep[]> {
  const adapter = getStorageAdapter()
  const created: ExperienceStep[] = []
  
  for (const stepData of steps) {
    const step: ExperienceStep = {
      ...stepData,
      id: generateId()
    } as ExperienceStep
    const saved = await adapter.saveItem<ExperienceStep>('experience_steps', step)
    created.push(saved)
  }
  
  return created
}

/**
 * Update an individual step's payload, title, or completion rule.
 */
export async function updateExperienceStep(stepId: string, updates: Partial<ExperienceStep>): Promise<ExperienceStep | null> {
  const adapter = getStorageAdapter()
  return adapter.updateItem<ExperienceStep>('experience_steps', stepId, updates)
}

/**
 * Permanently remove a step from an experience.
 */
export async function deleteExperienceStep(stepId: string): Promise<void> {
  const adapter = getStorageAdapter()
  await adapter.deleteItem('experience_steps', stepId)
}

/**
 * Reorder all steps for an experience instance based on a provided array of step IDs.
 */
export async function reorderExperienceSteps(instanceId: string, orderedIds: string[]): Promise<ExperienceStep[]> {
  const steps = await getExperienceSteps(instanceId);
  const stepMap = new Map(steps.map(s => [s.id, s]));

  // Validate all IDs belong to this experience and no duplicates
  if (orderedIds.length !== steps.length) {
    throw new Error(`Invalid reorder request: expected ${steps.length} IDs, got ${orderedIds.length}`);
  }
  
  const updatedSteps: ExperienceStep[] = [];
  const adapter = getStorageAdapter();

  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    const step = stepMap.get(id);
    if (!step) {
      throw new Error(`Step ID ${id} does not belong to experience ${instanceId}`);
    }
    
    // Update step_order in place and save
    const updated = await adapter.updateItem<ExperienceStep>('experience_steps', id, { step_order: i });
    updatedSteps.push(updated);
  }

  return updatedSteps.sort((a, b) => a.step_order - b.step_order);
}

/**
 * Insert a new step after a specific step ID and shift subsequent step orders.
 */
export async function insertStepAfter(instanceId: string, afterStepId: string, stepData: Omit<ExperienceStep, 'id'>): Promise<ExperienceStep> {
  const steps = await getExperienceSteps(instanceId);
  const afterStepIndex = steps.findIndex(s => s.id === afterStepId);
  
  if (afterStepIndex === -1) {
    throw new Error(`Step ID ${afterStepId} not found in experience ${instanceId}`);
  }

  const afterOrder = steps[afterStepIndex].step_order;
  const adapter = getStorageAdapter();

  // Shift all steps with step_order > afterOrder up by 1
  for (let i = afterStepIndex + 1; i < steps.length; i++) {
    const step = steps[i];
    await adapter.updateItem<ExperienceStep>('experience_steps', step.id, { step_order: step.step_order + 1 });
  }

  // Create new step at afterOrder + 1
  const newStep: ExperienceStep = {
    ...stepData,
    id: generateId(),
    step_order: afterOrder + 1
  } as ExperienceStep;
  
  return adapter.saveItem<ExperienceStep>('experience_steps', newStep);
}

import { SynthesisSnapshot } from '@/types/synthesis'

/**
 * AI-enriched completion service function for Sprint 7 (Lane 5)
 * Orchestrates post-completion processing: synthesis, facet extraction, and friction update.
 */
export async function completeExperienceWithAI(instanceId: string, userId: string): Promise<SynthesisSnapshot> {
  // 1. Create synthesis snapshot (now AI-powered via Lane 4's changes)
  const snapshot = await createSynthesisSnapshot(userId, 'experience', instanceId);
  
  // 2. Extract facets with AI (Lane 3's function)
  await extractFacetsWithAI(userId, instanceId);
  
  // 3. Update friction level
  await updateInstanceFriction(instanceId);

  return snapshot;
}

```

### lib/services/external-refs-service.ts

```typescript
/**
 * lib/services/external-refs-service.ts
 * Bidirectional mapping between local Mira entities and external provider records.
 * All reads/writes go through the storage adapter (SOP-6 + SOP-9).
 */

import type { ExternalRef, ExternalProvider } from '@/types/external-ref'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

type CreateExternalRefInput = Omit<ExternalRef, 'id' | 'createdAt'>

/** Create and persist a new ExternalRef. Returns the created record. */
export async function createExternalRef(data: CreateExternalRefInput): Promise<ExternalRef> {
  const adapter = getStorageAdapter()
  const ref: ExternalRef = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ...data,
  }
  return adapter.saveItem<ExternalRef>('externalRefs', ref)
}

/** All ExternalRefs for a specific local entity. */
export async function getExternalRefsForEntity(
  entityType: ExternalRef['entityType'],
  entityId: string
): Promise<ExternalRef[]> {
  const adapter = getStorageAdapter()
  const refs = await adapter.getCollection<ExternalRef>('externalRefs')
  return refs.filter((r) => r.entityType === entityType && r.entityId === entityId)
}


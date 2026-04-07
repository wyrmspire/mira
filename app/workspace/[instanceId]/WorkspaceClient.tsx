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
    // Guard against re-starting completed experiences (Sprint 25 Lane 1 W4)
    if (instance.status === 'completed') {
      setIsLoading(false);
      return;
    }

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
    fetch(`/api/experiences/${instance.id}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const resumeIndex = data.resumeStepIndex || 0;
        const freshSteps = data.steps || steps;
        const initialStatuses: Record<string, StepStatus> = {};
        freshSteps.forEach((step: any, idx: number) => {
          if (step.status === 'completed') {
            initialStatuses[step.id] = 'completed';
          } else if (step.status === 'skipped') {
            initialStatuses[step.id] = 'skipped';
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
    if (instance.status === 'completed') {
      setIsCompleted(true);
      setShowOverview(false);
      return;
    }
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

  const handleCompleteStep = async (payload?: unknown) => {
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

    // Persist step completion to DB
    try {
      const response = await fetch(`/api/experiences/${instance.id}/steps`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          stepId: currentStepId, 
          status: 'completed',
          completedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to persist step completion');
      }
    } catch (err) {
      console.error('[WorkspaceClient] Step completion persist failed:', err);
      alert('Failed to save progress. Please try again.');
      return; // Do NOT advance
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
      
      // Instance completion
      try {
        await fetch(`/api/experiences/${instance.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete' }),
        });
      } catch (err) {
        console.warn('[WorkspaceClient] Final status transition failed:', err);
      }
      
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
            <div className="flex items-center gap-2 mb-0.5">
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none">
                {instance.title}
              </div>
              {instance.status === 'completed' && (
                <div className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold uppercase tracking-tight">
                  Completed
                </div>
              )}
            </div>
            {!showOverview && !isCompleted && instance.status !== 'completed' && (
              <div className="flex items-center gap-3">
                <div className="text-[10px] font-mono text-[#475569] leading-none uppercase tracking-tighter">
                  Step {steps.findIndex(s => s.id === currentStepId) + 1} of {steps.length}
                </div>
                {currentLastSaved && (
                  <DraftIndicator lastSaved={currentLastSaved} />
                )}
              </div>
            )}
            {(isCompleted || instance.status === 'completed') && !showOverview && (
              <div className="text-[10px] font-mono text-emerald-400/60 leading-none uppercase tracking-tighter">
                Reviewing results
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {instance.status === 'completed' && (
              <button
                onClick={() => setIsCompleted(!isCompleted)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all border ${
                  isCompleted 
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-md' 
                    : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                }`}
              >
                {isCompleted ? 'View Steps' : 'View Results'}
              </button>
            )}
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
            readOnly={instance.status === 'completed' || isCompleted}
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

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

// Register built-in renderers
registerRenderer('questionnaire', QuestionnaireStep as any);
registerRenderer('lesson', LessonStep as any);

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

  // Track experience start on mount
  useEffect(() => {
    capture.trackExperienceStart();
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
      }).catch((err) => console.warn('[ExperienceRenderer] Failed to mark completed:', err));
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

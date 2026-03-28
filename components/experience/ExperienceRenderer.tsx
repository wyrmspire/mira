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
    } else if (stepType === 'checkpoint') {
      extraProps.initialAnswers = initialDraft;
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

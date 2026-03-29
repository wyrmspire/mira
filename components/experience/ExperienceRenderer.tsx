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
  const [coachForceExpanded, setCoachForceExpanded] = React.useState(false);
  const [coachMode, setCoachMode] = React.useState<'read' | 'tutor'>('read');

  // Reset trigger state on step change
  React.useEffect(() => {
    setFailedCheckpoint(false);
    setCoachForceExpanded(false);
    setCoachMode('read');
  }, [currentStepId]);

  const handleGradeComplete = (results: Record<string, any>) => {
    const hasFail = Object.values(results).some((r: any) => !r.correct);
    if (hasFail) setFailedCheckpoint(true);
  };

  const handleOpenCoach = () => {
    setCoachMode('tutor');
    setCoachForceExpanded(true);
  };

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

          {/* Lane 6: Coach Triggers */}
          <CoachTrigger 
            stepId={currentStep.id}
            userId={instance.user_id}
            onOpenCoach={handleOpenCoach}
            failedCheckpoint={failedCheckpoint}
            knowledgeLinks={currentStep.knowledge_links}
          />
        </div>
      ) : (
        <div className="text-[#94a3b8] italic text-center animate-pulse">Waking up Step Renderer...</div>
      )}
    </div>
  );
}

import React from 'react';

// TODO: Reconciliation with Lane 2 (types/experience.ts)
export interface ExperienceStep {
  id: string;
  instance_id: string;
  step_order: number;
  step_type: string;
  title: string;
  payload: any;
  completion_rule?: string;
}

export type StepRenderer = React.ComponentType<{
  step: ExperienceStep;
  onComplete: (payload?: unknown) => void;
  onSkip: () => void;
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
      <p className="text-[#94a3b8]">The step type <code className="text-indigo-300">"{step.step_type}"</code> is not registered in the system.</p>
    </div>
  );
}

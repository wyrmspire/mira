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

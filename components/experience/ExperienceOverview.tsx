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

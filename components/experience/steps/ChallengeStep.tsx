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
  const payload = step.payload as ChallengePayload | null;
  const objectives = payload?.objectives ?? [];

  const handleProofChange = (objectiveId: string, value: string) => {
    setCompleted((prev) => ({ ...prev, [objectiveId]: value }));
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
          return (
            <div
              key={obj.id}
              className={`p-6 rounded-2xl border transition-all duration-500 group ${
                isDone
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-[#12121a] border-[#1e1e2e] hover:border-amber-500/20'
              }`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                  isDone
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 rotate-[360deg]'
                    : 'bg-[#1a1a2e] border-[#33334d] text-[#475569] group-hover:border-amber-500/30'
                }`}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <p className={`text-lg font-medium transition-all ${
                  isDone ? 'text-emerald-400/70 line-through' : 'text-[#e2e8f0]'
                }`}>
                  {obj.description}
                </p>
              </div>

              <div className="ml-11">
                <textarea
                  value={completed[obj.id] || ''}
                  onChange={(e) => handleProofChange(obj.id, e.target.value)}
                  placeholder="Record your progress or results…"
                  rows={2}
                  className={`w-full bg-[#0d0d18] border rounded-xl px-4 py-3 text-sm text-[#e2e8f0] placeholder-[#94a3b8]/30 focus:outline-none transition-all resize-none ${
                    isDone ? 'border-emerald-500/20 focus:border-emerald-500/40' : 'border-[#1e1e2e] focus:border-amber-500/40'
                  }`}
                />
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

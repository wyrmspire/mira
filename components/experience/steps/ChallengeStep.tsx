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
}

export default function ChallengeStep({ step, onComplete, onSkip }: ChallengeStepProps) {
  const [completed, setCompleted] = useState<Record<string, string>>({});
  const payload = step.payload as ChallengePayload | null;
  const objectives = payload?.objectives ?? [];

  const handleProofChange = (objectiveId: string, value: string) => {
    setCompleted((prev) => ({ ...prev, [objectiveId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ completedObjectives: completed });
  };

  const allDone = objectives.length === 0 || objectives.every((obj) => !!completed[obj.id]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{step.title}</h2>
        <p className="text-sm text-amber-400/70 uppercase tracking-widest font-bold">Challenge</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {objectives.length === 0 && (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b] text-lg">Challenge objectives are being prepared.</p>
          </div>
        )}
        {objectives.map((obj, idx) => (
          <div
            key={obj.id}
            className={`p-5 rounded-xl border transition-all ${
              completed[obj.id]
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : 'bg-[#12121a] border-[#1e1e2e] hover:border-[#33334d]'
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              <span className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                completed[obj.id]
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-[#1a1a2e] border-[#33334d] text-[#64748b]'
              }`}>
                {completed[obj.id] ? '✓' : idx + 1}
              </span>
              <p className="text-[#e2e8f0] font-medium">{obj.description}</p>
            </div>

            {obj.proof && (
              <p className="text-xs text-[#64748b] mb-2 ml-9">Proof: {obj.proof}</p>
            )}

            <textarea
              value={completed[obj.id] || ''}
              onChange={(e) => handleProofChange(obj.id, e.target.value)}
              placeholder="Describe what you did…"
              rows={2}
              className="w-full ml-9 max-w-[calc(100%-2.25rem)] bg-[#0d0d18] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#94a3b8]/40 focus:outline-none focus:border-indigo-500/40 transition-colors resize-none"
            />
          </div>
        ))}

        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
          >
            Skip for now
          </button>
          <button
            type="submit"
            disabled={!allDone}
            className="px-8 py-3 bg-amber-500/20 text-amber-300 rounded-xl text-sm font-bold hover:bg-amber-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-amber-500/20"
          >
            Challenge Complete →
          </button>
        </div>
      </form>
    </div>
  );
}

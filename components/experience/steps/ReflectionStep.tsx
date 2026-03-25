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
}

export default function ReflectionStep({ step, onComplete, onSkip }: ReflectionStepProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const payload = step.payload as ReflectionPayload | null;
  const prompts = payload?.prompts ?? [];

  const handleChange = (promptId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [promptId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ reflections: responses });
  };

  const isComplete = prompts.length === 0 || prompts.every((p) => !!responses[p.id]?.trim());

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{step.title}</h2>
        <p className="text-sm text-violet-400/70 uppercase tracking-widest font-bold">Reflection</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {prompts.length === 0 && (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b] text-lg">Reflection prompts are being prepared.</p>
          </div>
        )}
        {prompts.map((prompt) => (
          <div key={prompt.id} className="space-y-3">
            <label className="block text-lg font-medium text-[#94a3b8] leading-relaxed">
              {prompt.text}
            </label>
            <textarea
              value={responses[prompt.id] || ''}
              onChange={(e) => handleChange(prompt.id, e.target.value)}
              placeholder="Take your time…"
              rows={4}
              className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-xl px-4 py-3 text-[#e2e8f0] placeholder-[#94a3b8]/40 focus:outline-none focus:border-violet-500/40 transition-colors resize-none leading-relaxed"
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
            disabled={!isComplete}
            className="px-8 py-3 bg-violet-500/20 text-violet-300 rounded-xl text-sm font-bold hover:bg-violet-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-violet-500/20"
          >
            Complete Reflection →
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import type { ExperienceStep } from '@/types/experience';

interface LessonPayload {
  sections: Array<{
    heading: string;
    body: string;
    type?: 'text' | 'callout' | 'checkpoint';
  }>;
}

interface LessonStepProps {
  step: ExperienceStep;
  onComplete: () => void;
  onSkip: () => void;
}

export default function LessonStep({ step, onComplete, onSkip }: LessonStepProps) {
  const [checkpoints, setCheckpoints] = useState<Record<number, boolean>>({});
  const payload = step.payload as LessonPayload | null;
  const sections = payload?.sections ?? [];

  const handleCheckpoint = (index: number) => {
    setCheckpoints((prev) => ({ ...prev, [index]: true }));
  };

  const isComplete = sections.length === 0 || sections.every(
    (s, i) => s.type !== 'checkpoint' || checkpoints[i]
  );

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-10 fade-in duration-700">
      <div className="mb-8">
        <h2 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight">{step.title}</h2>
      </div>

      <div className="space-y-10">
        {sections.length === 0 && (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b] text-lg">This lesson is being prepared by the experience builder.</p>
            <p className="text-[#475569] text-sm mt-2">Content will appear here once it's ready.</p>
          </div>
        )}
        {sections.map((section, idx) => (
          <div key={idx} className={`relative ${section.type === 'callout' ? 'p-6 bg-indigo-500/5 border-l-2 border-indigo-500 rounded-r-xl' : ''}`}>
            {section.heading && (
              <h3 className="text-xl font-semibold text-[#e2e8f0] mb-3">{section.heading}</h3>
            )}
            
            <p className="text-lg leading-relaxed text-[#94a3b8] whitespace-pre-wrap">
              {section.body}
            </p>

            {section.type === 'checkpoint' && (
              <div className="mt-6 flex items-center justify-center border border-dashed border-[#33334d] p-6 rounded-xl">
                {checkpoints[idx] ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <span className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center">✓</span>
                    Understood
                  </div>
                ) : (
                  <button
                    onClick={() => handleCheckpoint(idx)}
                    className="px-6 py-2 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30 hover:bg-indigo-500/30 transition-all font-medium"
                  >
                    Got it
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center justify-between pt-10 border-t border-[#1e1e2e]">
          <button
            onClick={onSkip}
            className="text-sm text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Skip for now
          </button>
          
          <button
            onClick={() => onComplete()}
            disabled={!isComplete}
            className="px-10 py-3 bg-indigo-600/20 text-indigo-100 rounded-xl text-sm font-bold hover:bg-indigo-600/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-indigo-600/30 shadow-lg shadow-indigo-900/10"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

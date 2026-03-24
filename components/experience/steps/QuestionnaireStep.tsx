'use client';

import React, { useState } from 'react';

// TODO: Reconciliation with Lane 2 (types/experience.ts)
interface ExperienceStep {
  id: string;
  instance_id: string;
  step_order: number;
  step_type: string;
  title: string;
  payload: {
    questions: Array<{
      id: string;
      label: string;
      type: 'text' | 'choice' | 'scale';
      options?: string[];
    }>;
  };
}

interface QuestionnaireStepProps {
  step: ExperienceStep;
  onComplete: (payload: { answers: Record<string, string> }) => void;
  onSkip: () => void;
}

export default function QuestionnaireStep({ step, onComplete, onSkip }: QuestionnaireStepProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleInputChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ answers });
  };

  const isComplete = step.payload.questions.every((q) => !!answers[q.id]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{step.title}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step.payload.questions.map((q) => (
          <div key={q.id} className="space-y-3">
            <label className="block text-lg font-medium text-[#94a3b8]">{q.label}</label>
            
            {q.type === 'text' && (
              <textarea
                value={answers[q.id] || ''}
                onChange={(e) => handleInputChange(q.id, e.target.value)}
                placeholder="Type your answer…"
                rows={3}
                className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-xl px-4 py-3 text-[#e2e8f0] placeholder-[#94a3b8]/50 focus:outline-none focus:border-indigo-500/40 transition-colors resize-none"
              />
            )}

            {q.type === 'choice' && (
              <div className="grid grid-cols-1 gap-2">
                {q.options?.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleInputChange(q.id, option)}
                    className={`px-4 py-3 rounded-xl border text-left transition-all ${
                      answers[q.id] === option
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300'
                        : 'bg-[#12121a] border-[#1e1e2e] text-[#94a3b8] hover:border-[#33334d]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'scale' && (
              <div className="flex justify-between items-center bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleInputChange(q.id, val.toString())}
                    className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
                      answers[q.id] === val.toString()
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                        : 'bg-[#1a1a2e] border-[#33334d] text-[#64748b] hover:border-indigo-500/30'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            )}
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
            className="px-8 py-3 bg-indigo-500/20 text-indigo-300 rounded-xl text-sm font-bold hover:bg-indigo-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-indigo-500/20"
          >
            Next Step →
          </button>
        </div>
      </form>
    </div>
  );
}

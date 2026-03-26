'use client';

import React, { useState } from 'react';
import type { ExperienceStep } from '@/types/experience';

interface QuestionPayload {
  questions: Array<{
    id: string;
    label: string;
    type: 'text' | 'choice' | 'scale';
    options?: string[];
  }>;
}

interface QuestionnaireStepProps {
  step: ExperienceStep;
  onComplete: (payload: { answers: Record<string, string> }) => void;
  onSkip: () => void;
  onDraft?: (draft: Record<string, any>) => void;
  readOnly?: boolean;
  initialAnswers?: Record<string, string>;
}

export default function QuestionnaireStep({ step, onComplete, onSkip, onDraft, readOnly, initialAnswers }: QuestionnaireStepProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers || {});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showError, setShowError] = useState(false);
  
  const payload = step.payload as QuestionPayload | null;
  const questions = payload?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const handleInputChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setShowError(false);
  };

  const handleNext = () => {
    if (!answers[currentQuestion.id]) {
      setShowError(true);
      return;
    }
    
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete({ answers });
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  if (readOnly) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 max-w-2xl mx-auto">
        <div className="border-b border-indigo-500/20 pb-6">
          <h2 className="text-3xl font-bold text-[#f1f5f9] tracking-tight mb-2">{step.title}</h2>
          <p className="text-sm text-indigo-400 font-mono uppercase tracking-widest font-bold">Review Mode</p>
        </div>
        
        <div className="space-y-8">
          {questions.map((q, idx) => (
            <div key={q.id} className="p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2e]">
              <label className="block text-sm font-bold text-[#475569] uppercase tracking-widest mb-3">
                {idx + 1}. {q.label}
              </label>
              <p className="text-xl text-[#e2e8f0] font-medium leading-relaxed">
                {answers[q.id] || <span className="text-[#33334d] italic">No answer provided</span>}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-xl mx-auto">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{step.title}</h2>
          {totalQuestions > 0 && (
            <p className="text-sm text-indigo-400 font-mono uppercase tracking-widest">
              Question {currentIndex + 1} of {totalQuestions}
            </p>
          )}
        </div>
      </div>

      {totalQuestions > 0 && (
        <div className="h-1 w-full bg-[#1e1e2e] rounded-full overflow-hidden mb-8">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="min-h-[300px] flex flex-col justify-center">
        {questions.length === 0 ? (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b] text-lg">Questions are being prepared.</p>
          </div>
        ) : (
          <div key={currentQuestion.id} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <label className={`block text-xl font-medium leading-relaxed transition-colors ${showError ? 'text-rose-400' : 'text-[#94a3b8]'}`}>
              {currentQuestion.label}
              {showError && <span className="text-sm ml-3 font-normal">Please provide an answer</span>}
            </label>
            
            {currentQuestion.type === 'text' && (
              <textarea
                autoFocus
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleInputChange(currentQuestion.id, e.target.value)}
                placeholder="Type your answer…"
                rows={4}
                className={`w-full bg-[#12121a] border rounded-xl px-5 py-4 text-[#e2e8f0] placeholder-[#94a3b8]/30 focus:outline-none transition-all resize-none text-lg ${
                  showError ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-[#1e1e2e] focus:border-indigo-500/40'
                }`}
              />
            )}

            {currentQuestion.type === 'choice' && (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options?.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleInputChange(currentQuestion.id, option)}
                    className={`px-5 py-4 rounded-xl border text-left transition-all text-lg font-medium ${
                      answers[currentQuestion.id] === option
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                        : showError 
                          ? 'bg-[#12121a] border-rose-500/20 text-[#64748b] hover:border-rose-500/40' 
                          : 'bg-[#12121a] border-[#1e1e2e] text-[#94a3b8] hover:border-[#33334d]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'scale' && (
              <div className={`flex justify-between items-center bg-[#12121a] border rounded-2xl p-6 transition-all ${
                showError ? 'border-rose-500/30' : 'border-[#1e1e2e]'
              }`}>
                {(currentQuestion.options?.length ? currentQuestion.options.map((_, i) => i + 1) : [1, 2, 3, 4, 5]).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleInputChange(currentQuestion.id, val.toString())}
                    className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all text-lg font-bold ${
                      answers[currentQuestion.id] === val.toString()
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 scale-110 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                        : 'bg-[#1a1a2e] border-[#33334d] text-[#475569] hover:border-indigo-500/30 hover:text-[#94a3b8]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-8 border-t border-[#1e1e2e]">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentIndex === 0}
            className="text-sm text-[#475569] hover:text-[#94a3b8] transition-colors disabled:opacity-0"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Skip for now
          </button>
        </div>
        
        <button
          type="button"
          onClick={handleNext}
          className="px-10 py-4 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          {currentIndex < totalQuestions - 1 ? 'Next Question →' : 'Finish Questionnaire →'}
        </button>
      </div>
    </div>
  );
}

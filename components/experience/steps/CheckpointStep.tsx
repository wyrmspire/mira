'use client';

import React, { useState } from 'react';
import type { ExperienceStep } from '@/types/experience';
import { CheckpointPayloadV1, CheckpointQuestion } from '@/lib/contracts/step-contracts';

interface CheckpointStepProps {
  step: ExperienceStep;
  onComplete: (payload: { answers: Record<string, string> }) => void;
  onSkip: () => void;
  onDraft?: (draft: Record<string, any>) => void;
  readOnly?: boolean;
  initialAnswers?: Record<string, string>;
}

export default function CheckpointStep({ step, onComplete, onSkip, onDraft, readOnly, initialAnswers }: CheckpointStepProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers || {});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showError, setShowError] = useState(false);
  
  const payload = step.payload as CheckpointPayloadV1 | null;
  const questions = payload?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const handleInputChange = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev, [questionId]: value };
      if (onDraft) {
        onDraft({ answers: newAnswers });
      }
      return newAnswers;
    });
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      case 'medium': return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
      case 'hard': return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
      default: return 'text-slate-400 border-slate-500/20 bg-slate-500/5';
    }
  };

  if (readOnly) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 max-w-2xl mx-auto">
        <div className="border-b border-amber-500/20 pb-6">
          <h2 className="text-3xl font-bold text-[#f1f5f9] tracking-tight mb-2">{step.title}</h2>
          <p className="text-sm text-amber-400 font-mono uppercase tracking-widest font-bold font-mono">Check Point Result</p>
        </div>
        
        <div className="space-y-8">
          {questions.map((q, idx) => (
            <div key={q.id} className="p-6 rounded-2xl bg-[#0f0f15] border border-amber-500/10">
              <div className="flex justify-between items-start mb-4">
                <label className="block text-xs font-bold text-amber-500/50 uppercase tracking-widest">
                  Question {idx + 1}
                </label>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getDifficultyColor(q.difficulty)}`}>
                  {q.difficulty}
                </span>
              </div>
              <p className="text-lg text-[#e2e8f0] font-medium leading-relaxed mb-4">
                {q.question}
              </p>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-[#94a3b8] font-medium italic">
                  {answers[q.id] || <span className="text-[#33334d]">No answer provided</span>}
                </p>
              </div>
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
            <div className="flex items-center gap-3">
              <p className="text-sm text-amber-400 font-mono uppercase tracking-widest">
                Verification {currentIndex + 1} of {totalQuestions}
              </p>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getDifficultyColor(currentQuestion.difficulty)}`}>
                {currentQuestion.difficulty}
              </span>
            </div>
          )}
        </div>
      </div>

      {totalQuestions > 0 && (
        <div className="h-1 w-full bg-[#1e1e2e] rounded-full overflow-hidden mb-8">
          <div 
            className="h-full bg-amber-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(245,158,11,0.3)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="min-h-[300px] flex flex-col justify-center">
        {questions.length === 0 ? (
          <div className="p-8 border border-dashed border-amber-500/20 rounded-xl text-center bg-amber-500/5">
            <p className="text-amber-500/50 text-lg font-mono tracking-tight">No verification points required for this phase.</p>
          </div>
        ) : (
          <div key={currentQuestion.id} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <label className={`block text-xl font-medium leading-relaxed transition-colors ${showError ? 'text-rose-400' : 'text-[#94a3b8]'}`}>
              {currentQuestion.question}
              {showError && <span className="text-sm ml-3 font-normal">Verification input required</span>}
            </label>
            
            {currentQuestion.format === 'free_text' && (
              <textarea
                autoFocus
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleInputChange(currentQuestion.id, e.target.value)}
                placeholder="Synthesize your answer…"
                rows={5}
                className={`w-full bg-[#0d0d12] border rounded-xl px-5 py-4 text-[#e2e8f0] placeholder-[#94a3b8]/20 focus:outline-none transition-all resize-none text-lg ${
                  showError ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-amber-500/10 focus:border-amber-500/40'
                }`}
              />
            )}

            {currentQuestion.format === 'choice' && (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options?.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleInputChange(currentQuestion.id, option)}
                    className={`px-5 py-4 rounded-xl border text-left transition-all text-lg font-medium ${
                      answers[currentQuestion.id] === option
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                        : showError 
                          ? 'bg-[#0d0d12] border-rose-500/20 text-[#475569] hover:border-rose-500/40' 
                          : 'bg-[#0d0d12] border-amber-500/5 text-[#64748b] hover:border-amber-500/20 hover:text-[#94a3b8]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-8 border-t border-amber-500/10">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentIndex === 0}
            className="text-xs font-bold uppercase tracking-widest text-[#475569] hover:text-amber-400 transition-colors disabled:opacity-0"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-bold uppercase tracking-widest text-[#475569] hover:text-amber-400 transition-colors"
          >
            Defer
          </button>
        </div>
        
        <button
          type="button"
          onClick={handleNext}
          className="px-10 py-4 bg-amber-500 text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
        >
          {currentIndex < totalQuestions - 1 ? 'Next Phase →' : 'Submit Verification →'}
        </button>
      </div>
    </div>
  );
}

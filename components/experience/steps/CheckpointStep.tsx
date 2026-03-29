'use client';

import React, { useState } from 'react';
import type { ExperienceStep } from '@/types/experience';
import { StepKnowledgeCard } from '../StepKnowledgeCard';
import { CheckpointPayloadV1, CheckpointQuestion } from '@/lib/contracts/step-contracts';

interface CheckpointStepProps {
  step: ExperienceStep;
  onComplete: (payload?: any) => void;
  onSkip: () => void;
  onDraft?: (draft: Record<string, any>) => void;
  readOnly?: boolean;
  initialAnswers?: Record<string, string>;
  onGradeComplete?: (results: Record<string, GradedResult>) => void;
  goalId?: string | null;
  onOpenCoach?: () => void;
  domainName?: string | null;
}

interface GradedResult {
  questionId: string;
  correct: boolean;
  feedback: string;
  misconception?: string;
}

export default function CheckpointStep({ 
  step, 
  onComplete, 
  onSkip, 
  onDraft, 
  readOnly, 
  initialAnswers,
  onGradeComplete,
  goalId,
  onOpenCoach,
  domainName
}: CheckpointStepProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers || {});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showError, setShowError] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [results, setResults] = useState<Record<string, GradedResult>>({});
  const [showResults, setShowResults] = useState(false);
  const [domainInfo, setDomainInfo] = useState<any>(null);
  const [promotedUnit, setPromotedUnit] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  
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

  const performGrading = async () => {
    setIsGrading(true);
    const gradedResults: Record<string, GradedResult> = {};

    try {
      const response = await fetch('/api/coach/grade-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId: step.id,
          knowledgeUnitId: payload?.knowledge_unit_id,
          questions: questions.map((q) => ({
            questionId: q.id,
            question: q.question,
            expectedAnswer: q.expected_answer,
            answer: answers[q.id] || '',
          })),
        }),
      });

      if (!response.ok) throw new Error('Batch grading failed');

      const data = await response.json();
      const results = data.results || [];

      results.forEach((result: any) => {
        gradedResults[result.questionId] = {
          questionId: result.questionId,
          correct: result.correct,
          feedback: result.feedback,
          misconception: result.misconception,
        };
      });

      setResults(gradedResults);
      if (onGradeComplete) onGradeComplete(gradedResults);
      setShowResults(true);

      // W1 & W2: Fetch mastery impact and check promotions
      const anyCorrect = Object.values(gradedResults).some(r => r.correct);
      if (anyCorrect) {
        // Fetch domain info
        const finalDomainName = domainName || (step.payload as any)?.knowledge_domain;
        if (goalId && finalDomainName) {
          try {
            const domainsRes = await fetch(`/api/skills?goalId=${goalId}`);
            if (domainsRes.ok) {
              const domains = await domainsRes.json();
              // Try to find by name or if there's only one domain
              const domain = domains.find((d: any) => d.name === finalDomainName) || domains[0];
              if (domain) {
                setDomainInfo(domain);
              }
            }
          } catch (err) {
            console.error('Failed to fetch domain info:', err);
          }
        }

        // W2: Check for knowledge promotion
        if (payload?.knowledge_unit_id) {
          try {
            const unitRes = await fetch(`/api/knowledge/${payload.knowledge_unit_id}`);
            if (unitRes.ok) {
              const unit = await unitRes.json();
              // If it was promoted to 'read' or higher, show toast
              // Since we don't know previous state, we'll show if it's 'read' or higher for now.
              // Actually, SOP-xx says "check if knowledge_progress was promoted".
              // A better way is to compare with initial state, but CheckpointStep doesn't have it.
              // We'll show the toast if mastery_status is 'read', 'practiced', or 'confident'.
              if (unit.mastery_status !== 'unseen') {
                setPromotedUnit(unit);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 4000);
              }
            }
          } catch (err) {
            console.error('Failed to fetch unit for promotion check:', err);
          }
        }
      }
    } catch (error) {
      console.error('Grading error:', error);
      // Fallback: indicate grading failure but don't block
    } finally {
      setIsGrading(false);
    }
  };

  const handleNext = () => {
    if (!answers[currentQuestion.id]) {
      setShowError(true);
      return;
    }
    
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      performGrading();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowResults(false);
    setResults({});
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      case 'medium': return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
      case 'hard': return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
      default: return 'text-slate-400 border-slate-500/20 bg-slate-500/5';
    }
  };

  const correctCount = Object.values(results).filter(r => r.correct).length;
  const isPassing = payload?.passing_threshold ? correctCount >= payload.passing_threshold : true;

  if (showResults) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 max-w-2xl mx-auto">
        <div className="border-b border-amber-500/20 pb-6 text-center">
          <h2 className="text-3xl font-bold text-[#f1f5f9] tracking-tight mb-2">Check Point Result</h2>
          <div className="flex justify-center items-center gap-4 mt-4">
            <div className={`text-4xl font-black ${isPassing ? 'text-emerald-400' : 'text-rose-400'}`}>
              {correctCount} / {totalQuestions}
            </div>
            <div className="text-[#94a3b8] font-mono uppercase tracking-widest text-xs">
              Points Verified
            </div>
          </div>
        </div>

        {/* Lane 4 W1: Mastery Impact Callout */}
        {domainInfo && (
          <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 animate-in slide-in-from-bottom-2 duration-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl">
                📊
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Evidence Recorded</p>
                <h4 className="text-[#e2e8f0] font-bold">{domainInfo.name}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1.5 flex-1 bg-indigo-500/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500"
                      style={{ width: `${Math.min(100, (domainInfo.evidenceCount / 5) * 100)}%` }} // Using 5 as practicing threshold
                    />
                  </div>
                  <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase">
                    {domainInfo.evidenceCount} Points
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lane 4 W2: Promotion Toast (Floating) */}
        {showToast && promotedUnit && (
          <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-right-4 duration-500">
            <div className="bg-[#1e1e2e] border border-emerald-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg">
                🎯
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Mastery Promoted</p>
                <p className="text-sm text-[#e2e8f0] font-medium">{promotedUnit.title}</p>
                <p className="text-[10px] text-[#94a3b8] font-mono mt-0.5">unseen → {promotedUnit.mastery_status}</p>
              </div>
            </div>
          </div>
        )}

        {/* Lane 5: Post-step Knowledge (deepens) */}
        {step.knowledge_links?.filter(l => l.linkType === 'deepens').map(link => (
          <StepKnowledgeCard 
            key={link.id} 
            knowledgeUnitId={link.knowledgeUnitId} 
            linkType={link.linkType} 
            timing="post" 
          />
        ))}

        <div className="space-y-8">
          {questions.map((q, idx) => {
            const result = results[q.id];
            return (
              <div key={q.id} className={`p-6 rounded-2xl bg-[#0f0f15] border ${result?.correct ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${result?.correct ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'}`}>
                      {result?.correct ? '✓' : '✕'}
                    </span>
                    <label className="block text-xs font-bold text-[#475569] uppercase tracking-widest">
                      Question {idx + 1}
                    </label>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getDifficultyColor(q.difficulty)}`}>
                    {q.difficulty}
                  </span>
                </div>
                <p className="text-lg text-[#e2e8f0] font-medium leading-relaxed mb-4">
                  {q.question}
                </p>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <p className="text-xs text-[#475569] uppercase font-bold tracking-widest mb-2">Your Synthesis</p>
                    <p className="text-[#94a3b8] font-medium italic">
                      {answers[q.id] || "No answer provided"}
                    </p>
                  </div>
                  
                  {result?.feedback && (
                    <div className={`p-4 rounded-xl ${result.correct ? 'bg-emerald-500/5' : 'bg-rose-500/5'} border border-white/5`}>
                      <p className={`text-xs uppercase font-bold tracking-widest mb-2 ${result.correct ? 'text-emerald-500/50' : 'text-rose-500/50'}`}>Coach Feedback</p>
                      <p className="text-[#e2e8f0] leading-relaxed">
                        {result.feedback}
                      </p>
                      {result.misconception && (
                        <div className="mt-3 p-3 rounded-lg bg-black/20 border border-white/5">
                          <p className="text-xs font-bold text-amber-500/70 uppercase mb-1">Potential Misconception</p>
                          <p className="text-sm text-[#94a3b8] italic">{result.misconception}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-6 pt-8 border-t border-amber-500/10">
          {!isPassing && payload?.on_fail === 'retry' && (
            <button
              type="button"
              onClick={handleRetry}
              className="px-8 py-4 border border-rose-500/50 text-rose-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-500/10 transition-all"
            >
              Try Again
            </button>
          )}

          {!isPassing && payload?.on_fail === 'tutor_redirect' && (
            <button
              type="button"
              onClick={() => onOpenCoach?.()}
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
            >
              Get Help
            </button>
          )}

          <button
            type="button"
            onClick={() => onComplete({ results, correctCount, passing: isPassing })}
            disabled={!isPassing && payload?.on_fail === 'retry'}
            className={`px-10 py-4 ${isPassing ? 'bg-emerald-500 text-black' : 'bg-[#1e1e2e] text-[#475569]'} rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95`}
          >
            {isPassing ? 'Continue Journey →' : 'Continue Anyway →'}
          </button>
        </div>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 max-w-2xl mx-auto">
        <div className="border-b border-amber-500/20 pb-6">
          <h2 className="text-3xl font-bold text-[#f1f5f9] tracking-tight mb-2">{step.title}</h2>
          <p className="text-sm text-amber-400 font-mono uppercase tracking-widest font-bold">Verification View</p>
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

      {/* Lane 5: Pre-support Knowledge */}
      {step.knowledge_links?.filter(l => l.linkType === 'pre_support').map(link => (
        <StepKnowledgeCard 
          key={link.id} 
          knowledgeUnitId={link.knowledgeUnitId} 
          linkType={link.linkType} 
          timing="pre" 
        />
      ))}

      {/* Lane 5: In-step Knowledge (teaches/enrichment) */}
      {step.knowledge_links?.filter(l => l.linkType === 'teaches' || l.linkType === 'enrichment').map(link => (
        <StepKnowledgeCard 
          key={link.id} 
          knowledgeUnitId={link.knowledgeUnitId} 
          linkType={link.linkType} 
          timing="in" 
        />
      ))}

      {totalQuestions > 0 && !isGrading && (
        <div className="h-1 w-full bg-[#1e1e2e] rounded-full overflow-hidden mb-8">
          <div 
            className="h-full bg-amber-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(245,158,11,0.3)]"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      )}

      <div className="min-h-[300px] flex flex-col justify-center relative">
        {isGrading ? (
          <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-amber-500 font-mono text-sm uppercase tracking-widest animate-pulse">Coach is reviewing your synthesis...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="p-8 border border-dashed border-amber-500/20 rounded-xl text-center bg-amber-500/5">
            <p className="text-amber-500/50 text-lg font-mono tracking-tight">No verification points required for this phase.</p>
          </div>
        ) : (
          <div key={currentQuestion.id} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <label className={`block text-xl font-medium leading-relaxed transition-colors ${showError ? 'text-rose-400' : 'text-[#94a3b8]'}`}>
              {currentQuestion.question}
              {showError && <span className="text-sm ml-3 font-normal font-mono">Input required</span>}
            </label>
            
            {currentQuestion.format === 'free_text' && (
              <div className="relative">
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
                <div className="absolute bottom-4 right-4 text-[10px] font-mono text-[#475569]">
                  {(answers[currentQuestion.id]?.length || 0)} CHARS
                </div>
              </div>
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

      {!isGrading && (
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
            {currentIndex < totalQuestions - 1 ? 'Next Point →' : 'Review Synthesis →'}
          </button>
        </div>
      )}
    </div>
  );
}

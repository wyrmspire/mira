'use client';

import React, { useState } from 'react';
import { CheckpointBlock } from '@/types/experience';
import { CheckCircle2, XCircle, Loader2, Sparkles, HelpCircle } from 'lucide-react';

interface CheckpointBlockRendererProps {
  block: CheckpointBlock;
  instanceId?: string;
  stepId?: string;
  className?: string;
}

interface GradeResult {
  correct: boolean;
  feedback: string;
  misconception?: string;
}

/**
 * CheckpointBlockRenderer: A granular assessment block with semantic grading.
 * Allows users to answer a single question and get immediate coach feedback.
 */
export default function CheckpointBlockRenderer({ block, instanceId, stepId, className = '' }: CheckpointBlockRendererProps) {
  const [answer, setAnswer] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGrade = async () => {
    if (!answer.trim()) {
      setError('Please provide an answer before checking.');
      return;
    }

    setIsGrading(true);
    setError(null);

    try {
      const response = await fetch('/api/coach/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          stepId,
          question: block.question,
          expectedAnswer: block.expected_answer,
          answer: answer.trim(),
        }),
      });

      if (!response.ok) throw new Error('Grading failed');

      const data = await response.json();
      setResult({
        correct: data.correct,
        feedback: data.feedback,
        misconception: data.misconception,
      });
    } catch (err) {
      console.error('Grading error:', err);
      setError('Could not grade your answer at this time. Please try again.');
    } finally {
      setIsGrading(false);
    }
  };

  const handleReset = () => {
    setAnswer('');
    setResult(null);
    setError(null);
  };

  return (
    <div className={`p-6 rounded-2xl bg-studio-surface/50 border border-studio-border/50 shadow-xl overflow-hidden relative group transition-all duration-500 hover:border-studio-accent/30 ${className}`}>
      {/* Subtle Glow Effect */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-studio-accent/5 rounded-full blur-3xl transition-opacity opacity-0 group-hover:opacity-100 pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-studio-accent/10 border border-studio-accent/20 flex items-center justify-center text-studio-accent">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-studio-accent uppercase tracking-widest">
              Check Point
            </span>
          </div>
          {result && (
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter border ${
              result.correct 
                ? 'bg-studio-success/10 border-studio-success/30 text-studio-success' 
                : 'bg-studio-danger/10 border-studio-danger/30 text-studio-danger'
            }`}>
              {result.correct ? 'Verified' : 'Review Needed'}
            </div>
          )}
        </div>

        {/* Question */}
        <h3 className="text-xl font-bold text-studio-text leading-tight tracking-tight">
          {block.question}
        </h3>

        {/* Answer Input Area */}
        <div className="space-y-4">
          {!result ? (
            <>
              <div className="relative group/input">
                <textarea
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isGrading}
                  placeholder="Type your synthesis here..."
                  className="w-full bg-studio-bg/50 border border-studio-border/50 rounded-xl px-5 py-4 text-studio-text placeholder-studio-text-muted/30 focus:outline-none focus:border-studio-accent/50 transition-all min-h-[120px] resize-none"
                />
                {error && (
                  <p className="mt-2 text-xs text-studio-danger font-medium animate-in fade-in slide-in-from-top-1">
                    {error}
                  </p>
                )}
              </div>

              <button
                onClick={handleGrade}
                disabled={isGrading || !answer.trim()}
                className="w-full relative py-4 bg-studio-accent text-studio-text font-black text-xs uppercase tracking-widest rounded-xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 shadow-lg shadow-studio-accent/20 group/btn"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover/btn:animate-shimmer" />
                <div className="flex items-center justify-center gap-2">
                  {isGrading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Grading...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify Understanding</span>
                    </>
                  )}
                </div>
              </button>
            </>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* User Solution Display */}
              <div className="p-4 rounded-xl bg-studio-bg/30 border border-studio-border/30">
                <p className="text-[10px] font-bold text-studio-text-muted uppercase tracking-widest mb-2">Your Answer</p>
                <p className="text-studio-text/80 italic font-medium">"{answer}"</p>
              </div>

              {/* Feedback Block */}
              <div className={`p-5 rounded-2xl border ${
                result.correct 
                  ? 'bg-studio-success/5 border-studio-success/20' 
                  : 'bg-studio-danger/5 border-studio-danger/20'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`mt-1 p-1 rounded-full ${
                    result.correct ? 'bg-studio-success/20 text-studio-success' : 'bg-studio-danger/20 text-studio-danger'
                  }`}>
                    {result.correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-studio-text leading-relaxed">
                      {result.feedback}
                    </p>
                    {result.misconception && (
                      <div className="mt-4 p-3 rounded-lg bg-studio-warning/5 border border-studio-warning/20">
                        <div className="flex items-center gap-2 mb-1">
                          <HelpCircle className="w-3 h-3 text-studio-warning" />
                          <span className="text-[10px] font-bold text-studio-warning uppercase tracking-tight">Coach's Insight</span>
                        </div>
                        <p className="text-xs text-studio-warning/80 italic">
                          {result.misconception}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Reset Action */}
              <button
                onClick={handleReset}
                className="w-full py-4 border border-studio-border/50 text-studio-text-muted font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all hover:bg-studio-muted/10 hover:text-studio-text"
              >
                Try Rephrasing
              </button>
            </div>
          )}
        </div>

        {/* Explanation / Metadata (Optional) */}
        {!result && block.explanation && (
          <div className="pt-4 border-t border-studio-border/30">
            <p className="text-xs text-studio-text-muted leading-relaxed italic">
              {block.explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

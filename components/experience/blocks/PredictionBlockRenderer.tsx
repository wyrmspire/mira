'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PredictionBlock } from '@/types/experience';
import { cn } from '@/lib/utils';
import { useInteractionCapture } from '@/lib/hooks/useInteractionCapture';

interface PredictionBlockRendererProps {
  block: PredictionBlock;
  instanceId?: string;
  stepId?: string;
  className?: string;
}

/**
 * PredictionBlockRenderer - Encourages pedagogical "active recall" by asking the 
 * user to predict an outcome before revealing the explanation/result.
 * Strictly designed around PredictionBlock payload.
 */
export default function PredictionBlockRenderer({
  block,
  instanceId,
  stepId,
  className
}: PredictionBlockRendererProps) {
  const [prediction, setPrediction] = useState('');
  const [revealed, setRevealed] = useState(false);
  
  const telemetry = useInteractionCapture(instanceId || '');

  const handleReveal = () => {
    setRevealed(true);
    if (instanceId && stepId) {
      telemetry.trackBlockPrediction(stepId, block.id, prediction.trim());
    }
  };

  return (
    <div className={cn(
      "overflow-hidden rounded-2xl border transition-all duration-700",
      revealed 
        ? "bg-studio-surface border-studio-border/50 shadow-inner" 
        : "bg-studio-accent/5 border-studio-accent/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-l-4",
      className
    )}>
      {/* Prompt / Challenge Area */}
      <div className="p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-500",
            revealed ? "bg-studio-muted text-studio-text-muted" : "bg-studio-accent/20 text-studio-accent"
          )}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-[.25em] text-studio-accent opacity-80">
            {revealed ? 'Outcome Revealed' : 'Make a Prediction'}
          </span>
        </div>
        
        <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
          {block.question}
        </h3>

        {!revealed && (
          <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <textarea
              value={prediction}
              onChange={(e) => setPrediction(e.target.value)}
              placeholder="Type your intuition here..."
              rows={3}
              className="w-full bg-studio-bg/60 border border-studio-border/50 rounded-xl px-5 py-4 text-studio-text placeholder-studio-text-muted/30 focus:outline-none focus:ring-1 focus:ring-studio-accent/30 focus:border-studio-accent/50 transition-all resize-none text-lg backdrop-blur-sm"
            />
            <div className="flex justify-end">
              <button
                onClick={handleReveal}
                disabled={!prediction.trim()}
                className="group flex items-center gap-3 px-10 py-3.5 bg-studio-accent text-white rounded-full hover:bg-studio-accent-hover hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all font-extrabold disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-studio-accent/20"
              >
                <span>Commit & Reveal</span>
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Result / Explanation Content */}
      {revealed && (
        <div className="border-t border-studio-border/30 bg-studio-bg/10 p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-700">
          <div className="prose prose-invert prose-indigo max-w-none prose-p:text-studio-text prose-p:text-lg prose-p:leading-relaxed prose-headings:text-white prose-strong:text-studio-accent prose-code:text-amber-300">
             <ReactMarkdown>{block.reveal_content}</ReactMarkdown>
          </div>

          <div className="mt-8 pt-6 border-t border-studio-border/20">
            <div className="flex items-center gap-2 mb-3">
               <span className="text-[10px] font-bold text-studio-text-muted uppercase tracking-widest">Your Prediction</span>
            </div>
            <p className="text-studio-text-muted italic bg-studio-surface/50 p-4 rounded-xl border border-studio-border/40 border-l-2 border-l-studio-accent shadow-sm">
              "{prediction}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

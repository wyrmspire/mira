'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ExerciseBlock } from '@/types/experience';
import { cn } from '@/lib/utils';
import { useInteractionCapture } from '@/lib/hooks/useInteractionCapture';

interface ExerciseBlockRendererProps {
  block: ExerciseBlock;
  instanceId?: string;
  stepId?: string;
  className?: string;
}

/**
 * ExerciseBlockRenderer - A self-contained task module with instructions 
 * and user input tracking. Part of the LearnIO interactive block set.
 */
export default function ExerciseBlockRenderer({
  block,
  instanceId,
  stepId,
  className
}: ExerciseBlockRendererProps) {
  const [completed, setCompleted] = useState(false);
  const [response, setResponse] = useState('');
  
  const telemetry = useInteractionCapture(instanceId || '');

  const handleComplete = () => {
    setCompleted(true);
    if (instanceId && stepId) {
      telemetry.trackBlockExercise(stepId, block.id, { response: response.trim() });
    }
  };

  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-500 overflow-hidden",
      completed 
        ? "bg-studio-success/5 border-studio-success/30 shadow-none" 
        : "bg-studio-surface border-studio-border shadow-xl hover:border-studio-muted transition-colors",
      className
    )}>
      <div className="p-6 sm:p-8 space-y-6">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                completed ? "bg-studio-success/20 text-studio-success" : "bg-studio-ice/20 text-studio-ice"
              )}>
                {completed ? 'Task Completed' : 'Active Exercise'}
              </span>
            </div>
            <h3 className="text-2xl font-extrabold text-white tracking-tight">{block.title}</h3>
          </div>
          
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500",
            completed 
              ? "bg-studio-success text-white border-studio-success shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
              : "bg-studio-surface border-studio-border text-studio-text-muted"
          )}>
            {completed ? (
              <svg className="w-6 h-6 animate-in zoom-in duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            )}
          </div>
        </div>

        {/* Instructions Markdown */}
        <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-p:text-studio-text prose-strong:text-studio-ice prose-code:text-amber-300">
          <ReactMarkdown>{block.instructions}</ReactMarkdown>
        </div>

        {/* Interaction Work Area */}
        {!completed ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative group">
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Submit your work or notes here..."
                rows={5}
                className="w-full bg-studio-bg/80 border border-studio-border rounded-xl px-5 py-4 text-studio-text placeholder-studio-text-muted/20 focus:outline-none focus:ring-1 focus:ring-studio-ice/30 focus:border-studio-ice/50 transition-all resize-none shadow-inner text-lg"
              />
              <div className="absolute bottom-4 right-4 flex gap-1 pointer-events-none">
                 <div className="w-1 h-1 rounded-full bg-studio-ice/40 animate-pulse [animation-delay:-0.3s]" />
                 <div className="w-1 h-1 rounded-full bg-studio-ice/40 animate-pulse [animation-delay:-0.15s]" />
                 <div className="w-1 h-1 rounded-full bg-studio-ice/40 animate-pulse" />
              </div>
            </div>
            
            {block.validation_criteria && (
              <div className="p-4 bg-studio-ice/5 border border-studio-ice/20 rounded-xl flex gap-3">
                <svg className="w-5 h-5 text-studio-ice shrink-0 relative top-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-studio-ice/80 leading-relaxed font-medium">
                  <span className="font-extrabold block mb-1 text-studio-ice text-[10px] uppercase tracking-widest">Requirements</span>
                  {block.validation_criteria}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handleComplete}
                disabled={!response.trim()}
                className="w-full py-4 bg-studio-surface border border-studio-border rounded-xl text-studio-text font-extrabold hover:bg-studio-bg hover:border-studio-ice/50 hover:text-studio-ice transition-all active:scale-[0.98] disabled:opacity-20 disabled:cursor-not-allowed group shadow-lg"
              >
                <div className="flex items-center justify-center gap-3">
                  <span>Mark Task as Complete</span>
                  <svg className="w-4 h-4 transition-all group-hover:translate-x-1 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center animate-in zoom-in-95 duration-700 bg-studio-bg/20 rounded-xl border border-studio-success/10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-studio-success/20 text-studio-success mb-5 border border-studio-success/30 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Great work!</h4>
            <p className="text-studio-text-muted text-sm max-w-xs mx-auto leading-relaxed">
              Your response has been committed. The context has been captured for your next interaction.
            </p>
            
            <button 
              onClick={() => setCompleted(false)}
              className="mt-8 text-[10px] font-bold text-studio-text-muted hover:text-studio-ice uppercase tracking-[0.2em] transition-all hover:tracking-[0.25em]"
            >
              [ Edit Submission ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

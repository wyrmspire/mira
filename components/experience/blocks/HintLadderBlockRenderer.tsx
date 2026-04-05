'use client';

import React, { useState } from 'react';
import { HintLadderBlock } from '@/types/experience';
import { Lightbulb, Plus, ChevronDown, Sparkles } from 'lucide-react';
import { useInteractionCapture } from '@/lib/hooks/useInteractionCapture';

interface HintLadderBlockRendererProps {
  block: HintLadderBlock;
  instanceId?: string;
  stepId?: string;
  className?: string;
}

/**
 * HintLadderBlockRenderer: A progressive disclosure component for clues.
 * Reveals hints one-by-one to guide the user without giving everything away.
 */
export default function HintLadderBlockRenderer({ block, instanceId, stepId, className = '' }: HintLadderBlockRendererProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const telemetry = useInteractionCapture(instanceId || '');

  const handleReveal = () => {
    if (revealedCount < block.hints.length) {
      const nextCount = revealedCount + 1;
      setRevealedCount(nextCount);
      
      if (instanceId && stepId) {
        telemetry.trackBlockHint(stepId, block.id, { 
          clueIndex: nextCount,
          totalClues: block.hints.length
        });
      }
    }
  };

  const hasMoreHints = revealedCount < block.hints.length;
  const allHintsRevealed = revealedCount === block.hints.length;

  return (
    <div className={`p-6 rounded-2xl bg-studio-surface/30 border border-studio-border/30 backdrop-blur-md relative overflow-hidden transition-all duration-300 ${className}`}>
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-studio-warning/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-studio-border/20 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-studio-warning/10 text-studio-warning">
              <Lightbulb className="w-4 h-4 fill-studio-warning/20" />
            </div>
            <span className="text-[10px] font-bold text-studio-warning uppercase tracking-widest">
              Hint Ladder
            </span>
          </div>
          <div className="text-[10px] font-mono text-studio-text-muted/50 uppercase tracking-widest">
            {revealedCount} / {block.hints.length} Stepping Stones
          </div>
        </div>

        {/* Revealed Hints Area */}
        <div className="space-y-4">
          {revealedCount === 0 && (
            <div className="py-2 animate-in fade-in zoom-in-95 duration-500">
              <p className="text-sm text-studio-text-muted italic leading-relaxed text-center">
                Need a push? Use the ladder to reveal strategic clues…
              </p>
            </div>
          )}

          {block.hints.slice(0, revealedCount).map((hint, index) => (
            <div 
              key={index}
              className="p-4 rounded-xl bg-studio-surface/50 border border-studio-border/50 animate-in slide-in-from-top-2 fade-in duration-500 relative group"
            >
              <div className="absolute left-[-1px] top-4 bottom-4 w-1 rounded-full bg-studio-warning/20 group-hover:bg-studio-warning/50 transition-colors" />
              <div className="flex gap-4">
                <span className="text-[10px] font-mono font-bold text-studio-warning/40 mt-1">
                  0{index + 1}
                </span>
                <p className="text-sm text-studio-text leading-relaxed font-medium">
                  {hint}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        {hasMoreHints && (
          <button
            onClick={handleReveal}
            className="w-full relative py-4 bg-studio-muted/10 border border-studio-warning/20 text-studio-warning font-black text-xs uppercase tracking-widest rounded-xl overflow-hidden transition-all hover:bg-studio-warning/10 hover:border-studio-warning/40 active:scale-[0.98] group/btn"
          >
            <div className="flex items-center justify-center gap-2">
              <Plus className="w-4 h-4 transition-transform group-hover/btn:rotate-90" />
              <span>{revealedCount === 0 ? 'Start the Ladder' : 'Reveal Next Step'}</span>
            </div>
          </button>
        )}

        {allHintsRevealed && (
          <div className="flex items-center justify-center gap-2 py-2 animate-in slide-in-from-bottom-2 duration-700">
            <Sparkles className="w-3 h-3 text-studio-accent" />
            <p className="text-[10px] font-bold text-studio-accent uppercase tracking-widest">
              Ladder Complete
            </p>
            <Sparkles className="w-3 h-3 text-studio-accent" />
          </div>
        )}
      </div>
    </div>
  );
}

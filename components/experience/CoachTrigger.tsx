'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { KnowledgeUnit } from '@/types/knowledge';
import { StepKnowledgeLink } from '@/types/curriculum';

interface CoachTriggerProps {
  stepId: string;
  userId: string;
  onOpenCoach: () => void;
  // External triggers
  failedCheckpoint?: boolean;
  knowledgeLinks?: StepKnowledgeLink[];
  missedQuestions?: string[];
}

/**
 * CoachTrigger - Lane 6
 * surfaces coach after failed checkpoints, extended dwell, or for unread units.
 */
export function CoachTrigger({
  stepId,
  userId,
  onOpenCoach,
  failedCheckpoint = false,
  knowledgeLinks = [],
  missedQuestions = []
}: CoachTriggerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [triggerType, setTriggerType] = useState<'failed_checkpoint' | 'dwell' | 'unread_knowledge' | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [unseenUnitTitle, setUnseenUnitTitle] = useState<string | null>(null);
  const [unseenUnitId, setUnseenUnitId] = useState<string | null>(null);

  // Reset visibility when step changes
  useEffect(() => {
    setIsVisible(false);
    setTriggerType(null);
    setDismissed(false);
    setUnseenUnitTitle(null);
    setUnseenUnitId(null);
  }, [stepId]);

  // 1. failed_checkpoint trigger
  useEffect(() => {
    if (failedCheckpoint && !dismissed && !isVisible) {
      setTriggerType('failed_checkpoint');
      setIsVisible(true);
    }
  }, [failedCheckpoint, dismissed, isVisible]);

  // 2. unread_knowledge trigger
  useEffect(() => {
    // Check if we already have a more critical trigger or if we're active
    if (dismissed || isVisible || (triggerType === 'failed_checkpoint')) return;

    const preSupportLinks = knowledgeLinks.filter(l => l.linkType === 'pre_support');
    if (preSupportLinks.length === 0) return;

    async function checkPreSupport() {
      try {
        for (const link of preSupportLinks) {
          const unitRes = await fetch(`/api/knowledge/${link.knowledgeUnitId}`);
          if (unitRes.ok) {
            const unitResData = await unitRes.json();
            // Handle possibility of data wrapping (e.g. { units: group }) or flat unit
            const unit: KnowledgeUnit = unitResData.unit || unitResData;

            if (unit.mastery_status === 'unseen') {
              setUnseenUnitTitle(unit.title);
              setUnseenUnitId(unit.id);
              setTriggerType('unread_knowledge');
              setIsVisible(true);
              return;
            }
          }
        }
      } catch (err) {
        console.error('CoachTrigger: failed to check pre-support', err);
      }
    }

    checkPreSupport();
  }, [knowledgeLinks, dismissed, isVisible, triggerType]);

  // 3. dwell trigger (> 5 mins)
  useEffect(() => {
    if (dismissed || isVisible || (triggerType !== null)) return;

    const timer = setTimeout(() => {
      setTriggerType('dwell');
      setIsVisible(true);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearTimeout(timer);
  }, [dismissed, isVisible, triggerType]);

  if (!isVisible || dismissed) return null;

  const getLabelContent = () => {
    if (triggerType === 'unread_knowledge' && unseenUnitTitle && unseenUnitId) {
      return (
        <span>
          📖 Review '{unseenUnitTitle}' before starting{' '}
          <Link href={`/knowledge/${unseenUnitId}`} className="text-amber-400 hover:text-amber-300 font-bold ml-1 transition-colors">
            → Review now
          </Link>
        </span>
      );
    }
    
    if (triggerType === 'failed_checkpoint' && missedQuestions && missedQuestions.length > 0) {
      const q = missedQuestions[0];
      const topic = q.length > 40 ? q.substring(0, 40) + '...' : q;
      return `You missed a few points. Want to review "${topic}"? 💬`;
    }

    const labels = {
      failed_checkpoint: "Need help with this? 💬",
      dwell: "Taking your time? The coach can help 💬",
      unread_knowledge: "📖 Reviewing some material might help first"
    };

    return labels[triggerType || 'dwell'];
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="bg-[#1e1e2e] border border-amber-500/30 rounded-2xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center gap-4 max-w-sm backdrop-blur-xl transition-all hover:border-amber-500/50 group">
        <div className="flex-1 min-w-[200px]">
          <div className="text-slate-200 text-sm font-medium leading-relaxed">
            {getLabelContent()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onOpenCoach();
              setIsVisible(false);
            }}
            className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
          >
            Chat
          </button>
          <button
            onClick={() => {
              setDismissed(true);
              setIsVisible(false);
            }}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-full hover:bg-white/5 active:scale-90 transition-all"
            aria-label="Dismiss message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

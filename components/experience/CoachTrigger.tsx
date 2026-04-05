'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { KnowledgeUnit } from '@/types/knowledge';
import { StepKnowledgeLink } from '@/types/curriculum';
import { useInteractionCapture } from '@/lib/hooks/useInteractionCapture';

interface CoachTriggerProps {
  stepId: string;
  userId: string;
  instanceId: string;
  onOpenCoach: () => void;
  // External triggers
  failedCheckpoint?: boolean;
  knowledgeLinks?: StepKnowledgeLink[];
  missedQuestions?: string[];
}

/**
 * CoachTrigger - Lane 4
 * surfaces coach after failed checkpoints, extended dwell, or for unread units.
 */
export function CoachTrigger({
  stepId,
  userId,
  instanceId,
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
  
  const { 
    trackCoachTriggerCheckpointFail, 
    trackCoachTriggerDwell, 
    trackCoachTriggerUnreadKnowledge 
  } = useInteractionCapture(instanceId);

  // Use refs to track if a specific trigger has already fired for this step session
  const triggeredSteps = useRef<Set<string>>(new Set());
  const sessionTriggers = useRef<Record<string, Set<string>>>({});

  const hasTriggered = (type: string) => {
    const key = `${stepId}:${type}`;
    return triggeredSteps.current.has(key);
  };

  const markTriggered = (type: string) => {
    const key = `${stepId}:${type}`;
    triggeredSteps.current.add(key);
  };

  // Reset visibility state when stepId changes
  useEffect(() => {
    setIsVisible(false);
    setTriggerType(null);
    setDismissed(false);
    setUnseenUnitTitle(null);
    setUnseenUnitId(null);
  }, [stepId]);

  // 1. failed_checkpoint trigger
  useEffect(() => {
    if (failedCheckpoint && !dismissed && !isVisible && !hasTriggered('failed_checkpoint')) {
      setTriggerType('failed_checkpoint');
      setIsVisible(true);
      markTriggered('failed_checkpoint');
      trackCoachTriggerCheckpointFail(stepId, { missedQuestions });
    }
  }, [failedCheckpoint, dismissed, isVisible, stepId, missedQuestions]);

  // 2. unread_knowledge trigger
  useEffect(() => {
    // Check if we already have a more critical trigger or if we're active
    if (dismissed || isVisible || (triggerType === 'failed_checkpoint') || hasTriggered('unread_knowledge')) return;

    const preSupportLinks = knowledgeLinks.filter(l => l.linkType === 'pre_support');
    if (preSupportLinks.length === 0) return;

    async function checkPreSupport() {
      try {
        const ids = preSupportLinks.map(l => l.knowledgeUnitId).join(',');
        const res = await fetch(`/api/knowledge/batch?ids=${ids}`);
        if (res.ok) {
          const { units } = await res.json();
          const unseen = (units as KnowledgeUnit[]).find(u => u.mastery_status === 'unseen');
          
          if (unseen) {
            setUnseenUnitTitle(unseen.title);
            setUnseenUnitId(unseen.id);
            setTriggerType('unread_knowledge');
            setIsVisible(true);
            markTriggered('unread_knowledge');
            trackCoachTriggerUnreadKnowledge(stepId, unseen.id);
          }
        }
      } catch (err) {
        console.error('CoachTrigger: failed to check pre-support', err);
      }
    }

    checkPreSupport();
  }, [knowledgeLinks, dismissed, isVisible, triggerType, stepId]);

  // 3. dwell trigger (> 3 mins)
  useEffect(() => {
    if (dismissed || isVisible || (triggerType !== null) || hasTriggered('dwell')) return;

    const dwellTime = 3 * 60 * 1000; // 3 minutes
    const timer = setTimeout(() => {
      setTriggerType('dwell');
      setIsVisible(true);
      markTriggered('dwell');
      trackCoachTriggerDwell(stepId, dwellTime);
    }, dwellTime);

    return () => clearTimeout(timer);
  }, [dismissed, isVisible, triggerType, stepId]);

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
      return `You missed a few points on "${topic}". Want to review? 💬`;
    }

    const labels = {
      failed_checkpoint: "Need help with this? 💬",
      dwell: "Taking your time? The coach can help 💬",
      unread_knowledge: "📖 Reviewing some material might help first"
    };

    return labels[triggerType || 'dwell'];
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom-4 duration-500 ease-out pointer-events-auto">
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
            className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 whitespace-nowrap"
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

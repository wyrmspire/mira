'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import { ExperienceClass } from '@/types/experience';

interface EphemeralToastProps {
  title: string;
  goal: string;
  experienceClass: ExperienceClass;
  instanceId: string;
  urgency?: 'low' | 'medium' | 'high';
  onDismiss?: () => void;
}

export function EphemeralToast({
  title,
  goal,
  experienceClass,
  instanceId,
  urgency = 'low',
  onDismiss
}: EphemeralToastProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  const duration = urgency === 'low' ? 15000 : urgency === 'medium' ? 30000 : 0;

  useEffect(() => {
    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem(`ephemeral_dismissed_${instanceId}`);
    if (dismissed) return;

    // Show after a short delay to feel "dropped in"
    const timer = setTimeout(() => setIsVisible(true), 1000);

    if (duration > 0) {
      const interval = 100;
      const step = (interval / duration) * 100;
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev <= 0) {
            clearInterval(progressInterval);
            setIsVisible(false);
            return 0;
          }
          return prev - step;
        });
      }, interval);

      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }

    return () => clearTimeout(timer);
  }, [instanceId, duration]);

  const handleStart = () => {
    setIsVisible(false);
    router.push(ROUTES.workspace(instanceId));
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem(`ephemeral_dismissed_${instanceId}`, 'true');
    if (onDismiss) onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 animate-in slide-in-from-right-full duration-500 ease-out">
      <div className="bg-[#0d0d18] border border-indigo-500/30 rounded-2xl shadow-2xl shadow-indigo-500/20 overflow-hidden backdrop-blur-md">
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 text-lg">⚡</span>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                New Moment
              </span>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-[#4a4a6a] hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#f1f5f9] leading-tight">
              {title}
            </h3>
            <p className="text-xs text-[#94a3b8] line-clamp-2 leading-relaxed">
              {goal}
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleStart}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-2.5 rounded-lg transition-all active:scale-95 uppercase tracking-wider"
            >
              Start Now →
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 bg-[#1e1e2e] hover:bg-[#2e2e3e] text-[#64748b] hover:text-[#94a3b8] text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider"
            >
              Later
            </button>
          </div>
        </div>

        {duration > 0 && (
          <div className="h-1 w-full bg-[#1e1e2e]">
            <div 
              className="h-full bg-indigo-500 transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(99,102,241,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

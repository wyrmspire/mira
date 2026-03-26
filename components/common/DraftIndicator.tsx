'use client';

import React, { useState, useEffect } from 'react';
import { formatRelativeTime } from '@/lib/date';

interface DraftIndicatorProps {
  lastSaved: string | null;
  isSaving?: boolean;
}

/**
 * Small, subtle indicator to show the last save/auto-save status.
 */
export function DraftIndicator({ lastSaved, isSaving = false }: DraftIndicatorProps) {
  const [ticker, setTicker] = useState(0);

  // Update the relative time display every minute
  useEffect(() => {
    if (!lastSaved) return;
    const interval = setInterval(() => {
      setTicker(t => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500 animate-pulse">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        <span>Saving…</span>
      </div>
    );
  }

  if (!lastSaved) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500">
      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
      <span>Last saved {formatRelativeTime(lastSaved)}</span>
    </div>
  );
}

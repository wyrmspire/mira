'use client';

import React from 'react';
import { MasteryStatus } from '@/types/knowledge';
import { COPY } from '@/lib/studio-copy';

interface MasteryBadgeProps {
  status: MasteryStatus;
  className?: string;
}

export default function MasteryBadge({ status, className = '' }: MasteryBadgeProps) {
  const getStatusStyles = (status: MasteryStatus) => {
    switch (status) {
      case 'unseen':
        return 'bg-[#1e1e2e] text-[#4a4a6a] border-[#1e1e2e]';
      case 'read':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'practiced':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'confident':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-[#1e1e2e] text-[#4a4a6a] border-[#1e1e2e]';
    }
  };

  return (
    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getStatusStyles(status)} ${className}`}>
      {COPY.knowledge.mastery[status]}
    </div>
  );
}

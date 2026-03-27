'use client';

import React from 'react';
import Link from 'next/link';
import { KnowledgeUnit } from '@/types/knowledge';
import { COPY } from '@/lib/studio-copy';
import { ROUTES } from '@/lib/routes';
import MasteryBadge from './MasteryBadge';

interface KnowledgeUnitCardProps {
  unit: KnowledgeUnit;
}

export default function KnowledgeUnitCard({ unit }: KnowledgeUnitCardProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'foundation':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'playbook':
        return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
      case 'deep_dive':
        return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'example':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-[#94a3b8] bg-[#1e1e2e] border-[#1e1e2e]';
    }
  };

  return (
    <Link 
      href={ROUTES.knowledgeUnit(unit.id)}
      className="flex flex-col p-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-indigo-500/5 h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getTypeColor(unit.unit_type)}`}>
          {COPY.knowledge.unitTypes[unit.unit_type]}
        </div>
        <MasteryBadge status={unit.mastery_status} />
      </div>

      <h3 className="text-base font-bold text-[#f1f5f9] mb-2 group-hover:text-indigo-300 transition-colors line-clamp-1">
        {unit.title}
      </h3>
      
      <p className="text-xs text-[#94a3b8] line-clamp-1 mb-4">
        {unit.thesis}
      </p>

      <div className="mt-auto pt-2 flex items-center text-[10px] font-bold uppercase tracking-widest text-[#4a4a6a] group-hover:text-indigo-400/70 transition-colors">
        Learn about this →
      </div>
    </Link>
  );
}

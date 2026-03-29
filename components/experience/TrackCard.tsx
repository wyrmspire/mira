'use client';

import React from 'react';
import Link from 'next/link';
import { CurriculumOutline } from '@/types/curriculum';
import { ROUTES } from '@/lib/routes';

interface TrackCardProps {
  outline: CurriculumOutline;
}

export default function TrackCard({ outline }: TrackCardProps) {
  const completedCount = outline.subtopics.filter(s => s.status === 'completed').length;
  const totalCount = outline.subtopics.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Find next target for "Continue" button
  const nextSubtopic = outline.subtopics.find(s => s.status !== 'completed');
  const continueHref = nextSubtopic?.experienceId ? ROUTES.workspace(nextSubtopic.experienceId) : null;

  const getStatusIcon = (status: 'pending' | 'in_progress' | 'completed') => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        );
      case 'in_progress':
        return (
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse ring-2 ring-indigo-500/20" />
        );
      default:
        return (
          <div className="w-1.5 h-1.5 rounded-full border border-[#33334d]" />
        );
    }
  };

  return (
    <div className="flex flex-col p-6 bg-[#000000] border border-[#1e1e2e] rounded-2xl hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-indigo-500/5 min-h-[380px]">
      <div className="flex justify-between items-start mb-4">
        <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
          Track
        </div>
        {outline.domain && (
          <div className="text-[10px] font-mono text-[#4a4a6a] uppercase tracking-tighter">
            {outline.domain}
          </div>
        )}
      </div>

      <h3 className="text-xl font-bold text-[#f1f5f9] mb-2 group-hover:text-indigo-300 transition-colors">
        {outline.topic}
      </h3>

      <div className="mb-6">
        <div className="flex justify-between text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
          <span>Completion</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full bg-[#1e1e2e] rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="space-y-4 mb-8 overflow-y-auto max-h-[120px] pr-2 scrollbar-none">
        {outline.subtopics.map((subtopic, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="mt-1">{getStatusIcon(subtopic.status)}</div>
            <div className="flex flex-col">
              <span className={`text-xs font-bold leading-tight ${subtopic.status === 'completed' ? 'text-[#4a4a6a] line-through' : 'text-[#e2e8f0]'}`}>
                {subtopic.title}
              </span>
              <span className="text-[10px] text-[#4a4a6a] line-clamp-1 mt-0.5">
                {subtopic.description}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto">
        {continueHref ? (
          <Link 
            href={continueHref}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
          >
            Continue Journey
          </Link>
        ) : (
          <div className="w-full py-4 text-center text-[10px] font-bold text-[#4a4a6a] bg-[#000000] rounded-xl border border-dashed border-[#33334d] uppercase tracking-widest">
            {outline.status === 'planning' ? 'Planning in progress...' : 'Awaiting next experience'}
          </div>
        )}
      </div>
    </div>
  );
}

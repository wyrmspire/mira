'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { KnowledgeUnit } from '@/types/knowledge';
import { StepKnowledgeLinkType } from '@/lib/constants';

interface StepKnowledgeCardProps {
  knowledgeUnitId: string;
  linkType: StepKnowledgeLinkType;
  timing: 'pre' | 'in' | 'post';
}

export function StepKnowledgeCard({ knowledgeUnitId, linkType, timing }: StepKnowledgeCardProps) {
  const [unit, setUnit] = useState<KnowledgeUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(timing !== 'post');

  useEffect(() => {
    async function fetchUnit() {
      try {
        const res = await fetch(`/api/knowledge/${knowledgeUnitId}`);
        if (res.ok) {
          const data = await res.json();
          setUnit(data);
        }
      } catch (err) {
        console.error('Failed to fetch knowledge unit:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUnit();
  }, [knowledgeUnitId]);

  if (loading) {
    return (
      <div className="animate-pulse bg-[#1e1e2e]/30 border border-[#1e1e2e] rounded-xl p-4 my-4 h-20" />
    );
  }

  if (!unit) return null;

  const getIcon = (type: StepKnowledgeLinkType) => {
    switch (type) {
      case 'teaches': return '📚';
      case 'tests': return '✅';
      case 'deepens': return '🔬';
      case 'pre_support': return '📖';
      case 'enrichment': return '✨';
      default: return '📖';
    }
  };

  const getTimingLabel = (t: 'pre' | 'in' | 'post') => {
    switch (t) {
      case 'pre': return 'Before you start';
      case 'in': return 'Key Reference';
      case 'post': return 'Go deeper';
      default: return '';
    }
  };

  const icon = getIcon(linkType);
  const timingLabel = getTimingLabel(timing);

  if (timing === 'in') {
    return (
      <div className="my-6 p-4 bg-[#0f0f17] border border-blue-500/20 rounded-xl shadow-sm hover:border-blue-500/40 transition-all group">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">{icon}</span>
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{timingLabel}</span>
        </div>
        <h4 className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
          {unit.title}
        </h4>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
          {unit.thesis}
        </p>
        <Link
          href={`/knowledge/${unit.id}`}
          className="text-[10px] font-bold text-blue-400/80 hover:text-blue-400 mt-3 inline-block uppercase tracking-wider"
        >
          Explore Unit →
        </Link>
      </div>
    );
  }

  return (
    <div className={`my-6 rounded-xl border transition-all duration-300 overflow-hidden ${
      timing === 'pre' 
        ? 'bg-indigo-500/5 border-indigo-500/20' 
        : 'bg-emerald-500/5 border-emerald-500/20'
    }`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-widest block text-left ${
              timing === 'pre' ? 'text-indigo-400' : 'text-emerald-400'
            }`}>
              {timingLabel}: {unit.title}
            </span>
          </div>
        </div>
        <span className={`transition-transform duration-300 text-slate-500 ${isExpanded ? 'rotate-180' : ''}`}>
          ↓
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            {unit.thesis}
          </p>
          <div className="flex items-center justify-between">
            <Link
              href={`/knowledge/${unit.id}`}
              className={`text-xs font-bold uppercase tracking-widest ${
                timing === 'pre' ? 'text-indigo-400' : 'text-emerald-400'
              } hover:underline`}
            >
              Open Resource →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

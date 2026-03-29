'use client';

import React from 'react';
import Link from 'next/link';
import { SkillDomain, SkillMasteryLevel } from '@/types/skill';
import { ROUTES } from '@/lib/routes';
import { COPY } from '@/lib/studio-copy';
import { MASTERY_THRESHOLDS, SKILL_MASTERY_LEVELS } from '@/lib/constants';

export type GridSkillDomain = SkillDomain & {
  _completedCount?: number;
  _nextExperienceId?: string | null;
};

interface SkillTreeCardProps {
  domain: GridSkillDomain;
}

export default function SkillTreeCard({ domain }: SkillTreeCardProps) {
  const getMasteryColor = (level: SkillMasteryLevel) => {
    switch (level) {
      case 'expert':
        return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'proficient':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'practicing':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'beginner':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'aware':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'undiscovered':
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const masteryWeight = {
    'undiscovered': 0,
    'aware': 20,
    'beginner': 40,
    'practicing': 60,
    'proficient': 80,
    'expert': 100,
  };

  const progress = masteryWeight[domain.masteryLevel] || 0;

  const currentLevelIdx = SKILL_MASTERY_LEVELS.indexOf(domain.masteryLevel);
  const nextLevel = currentLevelIdx < SKILL_MASTERY_LEVELS.length - 1 
    ? SKILL_MASTERY_LEVELS[currentLevelIdx + 1] 
    : domain.masteryLevel;
  
  const evidenceNeeded = domain.masteryLevel === 'expert' 
    ? 0 
    : Math.max(0, MASTERY_THRESHOLDS[nextLevel] - domain.evidenceCount);

  const totalLinked = domain.linkedExperienceIds.length;
  const completedCount = domain._completedCount || 0;
  const nextExperienceId = domain._nextExperienceId;

  return (
    <div className="flex flex-col p-6 bg-[#000000] border border-[#1e1e2e] rounded-2xl hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-indigo-500/5 min-h-[220px]">
      <div className="flex justify-between items-start mb-4">
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getMasteryColor(domain.masteryLevel)}`}>
          {domain.masteryLevel}
        </div>
        <div className="text-[10px] font-mono text-[#4a4a6a] uppercase tracking-tighter text-right">
          <div>{domain.evidenceCount} {COPY.skills.evidenceTitle}</div>
          {totalLinked > 0 && (
            <div className="text-[#64748b] mt-0.5 lowercase font-sans text-[9px] tracking-normal">
              {COPY.skills.experiencesDone.replace('{completed}', String(completedCount)).replace('{total}', String(totalLinked))}
            </div>
          )}
        </div>
      </div>

      <Link href={ROUTES.skillDomain(domain.id)}>
        <h3 className="text-xl font-bold text-[#f1f5f9] mb-2 group-hover:text-indigo-300 transition-colors capitalize">
          {domain.name.replace(/-/g, ' ')}
        </h3>
      </Link>

      <p className="text-sm text-[#94a3b8] line-clamp-2 mb-2 min-h-[2.5rem]">
        {domain.description}
      </p>

      <div className="text-xs text-[#64748b] mb-4">
        {domain.masteryLevel === 'expert' 
          ? COPY.skills.maxLevel
          : COPY.skills.neededForNext.replace('{count}', String(evidenceNeeded)).replace('{level}', nextLevel)
        }
      </div>

      <div className="mt-auto space-y-4">
        <div>
          <div className="flex justify-between text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
            <span>{COPY.skills.domainProgress}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-[#1e1e2e] rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)] ${
                domain.masteryLevel === 'expert' ? 'bg-violet-500 shadow-violet-500/30' :
                domain.masteryLevel === 'proficient' ? 'bg-emerald-500 shadow-emerald-500/30' :
                'bg-indigo-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {nextExperienceId ? (
          <Link 
            href={ROUTES.workspace(nextExperienceId)}
            className="flex items-center justify-between group/link"
          >
            <span className="text-xs font-bold text-indigo-400 group-hover/link:text-indigo-300 transition-colors">
              {COPY.skills.actions.whatNext}
            </span>
            <span className="text-indigo-400 group-hover/link:translate-x-1 transition-transform">→</span>
          </Link>
        ) : totalLinked > 0 ? (
          <Link 
            href={ROUTES.library}
            className="flex items-center justify-between group/link"
          >
            <span className="text-xs font-bold text-emerald-400 group-hover/link:text-emerald-300 transition-colors">
              {COPY.skills.allCompleted}
            </span>
          </Link>
        ) : (
          <div className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest italic pt-1">
            Undiscovered terrain
          </div>
        )}
      </div>
    </div>
  );
}

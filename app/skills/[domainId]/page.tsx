export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { getSkillDomain } from '@/lib/services/skill-domain-service';
import { getExperienceInstanceById } from '@/lib/services/experience-service';
import { getKnowledgeUnitsByIds } from '@/lib/services/knowledge-service';
import { COPY } from '@/lib/studio-copy';
import { ROUTES } from '@/lib/routes';
import { MASTERY_THRESHOLDS, SKILL_MASTERY_LEVELS } from '@/lib/constants';

interface PageProps {
  params: {
    domainId: string;
  };
}

export default async function SkillDomainDetailPage({ params }: PageProps) {
  const domain = await getSkillDomain(params.domainId);
  
  if (!domain) {
    notFound();
  }

  // Calculate mastery needed
  const currentLevelIdx = SKILL_MASTERY_LEVELS.indexOf(domain.masteryLevel);
  const nextLevel = currentLevelIdx < SKILL_MASTERY_LEVELS.length - 1 
    ? SKILL_MASTERY_LEVELS[currentLevelIdx + 1] 
    : domain.masteryLevel;
  
  const evidenceNeeded = domain.masteryLevel === 'expert' 
    ? 0 
    : Math.max(0, MASTERY_THRESHOLDS[nextLevel] - (domain.evidenceCount || 0));

  // Fetch experiences
  const experiences = domain.linkedExperienceIds.length > 0 
    ? await Promise.all(domain.linkedExperienceIds.map(id => getExperienceInstanceById(id)))
    : [];
  const validExperiences = experiences.filter(exp => exp !== null);

  // Fetch knowledge units
  const knowledgeUnits = domain.linkedUnitIds.length > 0
    ? await getKnowledgeUnitsByIds(domain.linkedUnitIds)
    : [];

  const getMasteryColor = (level: string) => {
    switch (level) {
      case 'expert': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'proficient': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'practicing': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'beginner': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'aware': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getKnowledgeColor = (status: string) => {
    switch (status) {
      case 'confident': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'practiced': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'read': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-400 border-emerald-500/20';
      case 'active': return 'text-indigo-400 border-indigo-500/20';
      default: return 'text-slate-400 border-slate-500/20';
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

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-10 px-6">
        <Link 
          href={ROUTES.skills}
          className="inline-flex items-center text-[#64748b] hover:text-indigo-400 transition-colors text-sm font-medium mb-8"
        >
          {COPY.skills.detail.backLink}
        </Link>
        
        {/* Header section... */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-4xl font-black text-white capitalize tracking-tight">
              {domain.name.replace(/-/g, ' ')}
            </h1>
            <div className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-tight border ${getMasteryColor(domain.masteryLevel)}`}>
              {domain.masteryLevel}
            </div>
          </div>
          
          <p className="text-[#94a3b8] text-lg max-w-2xl mb-8">
            {domain.description}
          </p>

          <div className="p-6 bg-[#000000] border border-[#1e1e2e] rounded-2xl w-full max-w-xl">
            <div className="flex justify-between items-end mb-3">
              <div className="text-sm font-bold text-[#4a4a6a] uppercase tracking-widest">
                {COPY.skills.domainProgress}
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#f1f5f9]">{domain.evidenceCount} {COPY.skills.evidenceTitle}</div>
                <div className="text-xs text-[#64748b]">
                  {domain.masteryLevel === 'expert' 
                    ? COPY.skills.maxLevel
                    : COPY.skills.neededForNext.replace('{count}', String(evidenceNeeded)).replace('{level}', nextLevel)
                  }
                </div>
              </div>
            </div>
            <div className="h-2 w-full bg-[#1e1e2e] rounded-full overflow-hidden">
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
        </div>

        {/* Content Tabs / Grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* Experiences Column */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-[#4a4a6a] uppercase tracking-[0.2em] border-b border-[#1e1e2e] pb-2">
              {COPY.skills.detail.experiencesTitle}
            </h3>
            
            {validExperiences.length > 0 ? (
              <div className="space-y-4">
                {validExperiences.map(exp => (
                  <Link 
                    key={exp!.id}
                    href={ROUTES.workspace(exp!.id)}
                    className="block p-4 border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-colors group bg-[#0d0d18]/50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-[#f1f5f9] group-hover:text-indigo-300 transition-colors">
                        {exp!.title}
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded ${getStatusColor(exp!.status)}`}>
                        {exp!.status}
                      </div>
                    </div>
                    <div className="text-xs text-[#64748b] truncate">
                      {exp!.goal}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[#4a4a6a] italic">
                {COPY.skills.detail.emptyExperiences}
              </div>
            )}
          </div>

          {/* Knowledge Column */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-[#4a4a6a] uppercase tracking-[0.2em] border-b border-[#1e1e2e] pb-2">
              {COPY.skills.detail.knowledgeTitle}
            </h3>
            
            {knowledgeUnits.length > 0 ? (
              <div className="space-y-4">
                {knowledgeUnits.map(unit => (
                  <Link 
                    key={unit.id}
                    href={ROUTES.knowledgeUnit(unit.id)}
                    className="block p-4 border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-colors group bg-[#0d0d18]/50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-[#f1f5f9] group-hover:text-indigo-300 transition-colors">
                        {unit.title}
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded ${getKnowledgeColor(unit.mastery_status)}`}>
                        {unit.mastery_status}
                      </div>
                    </div>
                    <div className="text-xs text-[#64748b] truncate">
                      {unit.thesis}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[#4a4a6a] italic">
                {COPY.skills.detail.emptyKnowledge}
              </div>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}

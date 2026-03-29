export const dynamic = 'force-dynamic'

import React from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { getGoalsForUser } from '@/lib/services/goal-service';
import { getSkillDomainsForGoal } from '@/lib/services/skill-domain-service';
import { getExperienceInstanceById } from '@/lib/services/experience-service';
import { DEFAULT_USER_ID } from '@/lib/constants';
import { COPY } from '@/lib/studio-copy';
import SkillTreeGrid from '@/components/skills/SkillTreeGrid';
import Link from 'next/link';
import { ROUTES } from '@/lib/routes';

export default async function SkillsPage() {
  const userId = DEFAULT_USER_ID;
  const goals = await getGoalsForUser(userId);
  
  // Fetch domains for each goal
  const goalsWithDomains = await Promise.all(
    goals.map(async (goal) => {
      const domains = await getSkillDomainsForGoal(goal.id);
      
      const enrichedDomains = await Promise.all(
        domains.map(async (domain) => {
          let completedCount = 0;
          let nextExpId: string | null = null;

          if (domain.linkedExperienceIds.length > 0) {
            const experiences = await Promise.all(
              domain.linkedExperienceIds.map(id => getExperienceInstanceById(id))
            );
            
            for (const exp of experiences) {
              if (!exp) continue;
              if (exp.status === 'completed') {
                completedCount++;
              } else if (!nextExpId && exp.status !== 'archived') {
                nextExpId = exp.id;
              }
            }
          }
          
          return {
            ...domain,
            _completedCount: completedCount,
            _nextExperienceId: nextExpId,
          };
        })
      );
      
      return { ...goal, domainsList: enrichedDomains };
    })
  );

  const hasGoals = goalsWithDomains.length > 0;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto py-10 px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tight italic">
              {COPY.skills.heading}
            </h1>
            <p className="text-[#94a3b8] text-lg font-light max-w-xl leading-relaxed">
              {COPY.skills.subheading}
            </p>
          </div>
          <Link 
            href={ROUTES.send}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] text-center"
          >
            {COPY.goals.actions.createGoal}
          </Link>
        </div>

        {!hasGoals ? (
          <div className="py-20 px-6 border border-dashed border-[#1e1e2e] rounded-[2.5rem] text-center bg-[#0d0d18]/30 backdrop-blur-sm space-y-6">
            <div className="w-16 h-16 bg-[#1e1e2e] rounded-full flex items-center justify-center mx-auto text-3xl">
              ⌬
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">No active trajectory.</h3>
              <p className="text-[#4a4a6a] max-w-xs mx-auto">
                {COPY.skills.emptyState}
              </p>
            </div>
            <Link 
              href={ROUTES.send}
              className="inline-block text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
            >
              Start the conversation →
            </Link>
          </div>
        ) : (
          <div className="space-y-16">
            {goalsWithDomains.map((goal) => (
              <div key={goal.id} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-black text-[#4a4a6a] uppercase tracking-[0.2em] whitespace-nowrap">
                    Goal: {goal.title}
                  </h2>
                  <div className="h-px w-full bg-gradient-to-r from-[#1e1e2e] to-transparent" />
                </div>
                
                <SkillTreeGrid domains={goal.domainsList} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ExperienceInstance } from '@/types/experience';
import ExperienceCard from '@/components/experience/ExperienceCard';
import { COPY } from '@/lib/studio-copy';
import { ROUTES } from '@/lib/routes';

interface LibraryClientProps {
  active: ExperienceInstance[];
  completed: ExperienceInstance[];
  moments: ExperienceInstance[];
  proposed: ExperienceInstance[];
}

export default function LibraryClient({ 
  active, 
  completed, 
  moments, 
  proposed 
}: LibraryClientProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAcceptAndStart = async (id: string) => {
    setLoadingId(id);
    try {
      // Chain: approve → publish → activate
      // If any step returns 422, the experience may already be past that state — continue
      const steps: string[] = ['approve', 'publish', 'activate'];
      
      for (const action of steps) {
        const res = await fetch(`/api/experiences/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        
        if (res.status === 422) {
          // Already past this state — skip to next step
          console.log(`Skipping ${action} — experience already past this state`);
          continue;
        }
        
        if (!res.ok) {
          throw new Error(`Failed to ${action}`);
        }
      }

      // Navigate to workspace
      router.push(ROUTES.workspace(id));
      router.refresh();
    } catch (error) {
      console.error('Workflow failed:', error);
      // If all transitions failed, the experience might already be active — try navigating anyway
      router.push(ROUTES.workspace(id));
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  };

  const Section = ({ title, empty, items, children }: { 
    title: string; 
    empty: string; 
    items: ExperienceInstance[];
    children: (item: ExperienceInstance) => React.ReactNode;
  }) => {
    if (items.length === 0) return null;
    return (
      <section className="mb-16">
        <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-6 px-1">
          {title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(children)}
        </div>
      </section>
    );
  };

  return (
    <div>
      {/* Suggestions (Pending Review) */}
      <Section 
        title={COPY.library.reviewSection} 
        empty={COPY.library.emptyReview} 
        items={proposed}
      >
        {(instance) => (
          <ExperienceCard key={instance.id} instance={instance}>
            <button 
              onClick={() => handleAcceptAndStart(instance.id)}
              disabled={!!loadingId}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all disabled:opacity-50"
            >
              {loadingId === instance.id ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{COPY.library.acceptAndStart}</span>
              )}
            </button>
          </ExperienceCard>
        )}
      </Section>

      {/* Active Journeys */}
      <Section 
        title={COPY.library.activeSection} 
        empty={COPY.library.emptyActive} 
        items={active}
      >
        {(instance) => (
          <ExperienceCard key={instance.id} instance={instance}>
            <Link 
              href={ROUTES.workspace(instance.id)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500/10 text-indigo-400 rounded-xl font-bold hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
            >
              {COPY.library.enter}
            </Link>
          </ExperienceCard>
        )}
      </Section>

      {/* Completed Experiences */}
      <Section 
        title={COPY.library.completedSection} 
        empty={COPY.library.emptyCompleted} 
        items={completed}
      >
        {(instance) => (
          <ExperienceCard key={instance.id} instance={instance} />
        )}
      </Section>

      {/* Moments (Ephemeral) */}
      <Section 
        title={COPY.library.momentsSection} 
        empty={COPY.library.emptyMoments} 
        items={moments}
      >
        {(instance) => (
          <ExperienceCard key={instance.id} instance={instance}>
             {instance.status !== 'completed' && (
               <Link 
                 href={ROUTES.workspace(instance.id)}
                 className="w-full mt-2 py-2 text-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Enter Moment →
                </Link>
             )}
          </ExperienceCard>
        )}
      </Section>
    </div>
  );
}

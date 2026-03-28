'use client';

import React, { useState, useMemo } from 'react';
import { KnowledgeUnit, MasteryStatus } from '@/types/knowledge';
import { COPY } from '@/lib/studio-copy';
import DomainCard from '@/components/knowledge/DomainCard';
import KnowledgeUnitCard from '@/components/knowledge/KnowledgeUnitCard';

interface KnowledgeClientProps {
  units: KnowledgeUnit[];
  domains: { domain: string; count: number; readCount: number }[];
  recentlyAdded: KnowledgeUnit[];
  resumeUnit: KnowledgeUnit | null;
}

export default function KnowledgeClient({ 
  units, 
  domains, 
  recentlyAdded, 
  resumeUnit 
}: KnowledgeClientProps) {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const unitGroups = useMemo(() => {
    if (!selectedDomain) return [];
    
    const domainUnits = units
      .filter(u => u.domain === selectedDomain)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    const groups: { date: string; units: KnowledgeUnit[]; isRun: boolean }[] = [];
    
    domainUnits.forEach(unit => {
      const unitTime = new Date(unit.created_at).getTime();
      const lastGroup = groups[groups.length - 1];
      
      // If within 5 min window
      if (lastGroup && Math.abs(new Date(lastGroup.date).getTime() - unitTime) < 5 * 60 * 1000) {
        lastGroup.units.push(unit);
        lastGroup.isRun = true;
      } else {
        groups.push({
          date: unit.created_at,
          units: [unit],
          isRun: false
        });
      }
    });
    
    return groups;
  }, [units, selectedDomain]);

  if (units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in duration-700">
        <div className="w-20 h-20 bg-indigo-500/5 rounded-full flex items-center justify-center mb-6 border border-indigo-500/10">
          <span className="text-4xl">📚</span>
        </div>
        <h3 className="text-xl font-bold text-[#f1f5f9] mb-2">
          {COPY.knowledge.emptyState}
        </h3>
        <p className="text-[#4a4a6a] max-w-sm">
          Mira synthesizes knowledge from your experiences to build a persistent library of your territory.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Dashboard Section */}
      {!selectedDomain && (
        <>
          <section className="mb-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Resume last topic */}
            <div className="lg:col-span-2 flex flex-col p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="text-8xl">✍️</span>
              </div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-6">Resume your terrain</h2>
              {resumeUnit ? (
                <div className="relative z-10 w-full">
                  <KnowledgeUnitCard unit={resumeUnit} />
                </div>
              ) : (
                <p className="text-[#4a4a6a] italic">You've mastered everything currently in progress. Start a new experience to expand your knowledge.</p>
              )}
            </div>

            {/* Recently Added */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a6a] px-2">
                {COPY.knowledge.sections.recentlyAdded}
              </h2>
              {recentlyAdded.map(unit => (
                <KnowledgeUnitCard key={unit.id} unit={unit} />
              ))}
            </div>
          </section>

          {/* Domain Navigation */}
          <section>
            <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-8 px-1">
              {COPY.knowledge.sections.domains}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {domains.map(d => (
                <DomainCard 
                  key={d.domain}
                  domain={d.domain}
                  unitCount={d.count}
                  readCount={d.readCount}
                  onClick={() => setSelectedDomain(d.domain)}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Domain View */}
      {selectedDomain && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <button 
            onClick={() => setSelectedDomain(null)}
            className="group flex items-center text-xs font-bold uppercase tracking-widest text-[#4a4a6a] hover:text-indigo-400 mb-8 transition-colors"
          >
            <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
            Back to Dashboard
          </button>
          
          <header className="mb-12">
            <h2 className="text-3xl font-bold text-[#f1f5f9] capitalize mb-2">{selectedDomain.replace(/-/g, ' ')}</h2>
            <p className="text-[#4a4a6a]">{units.filter(u => u.domain === selectedDomain).length} Units of knowledge in this domain.</p>
          </header>

          <div className="space-y-12">
            {unitGroups.map((group, idx) => (
              <div key={idx} className="space-y-6">
                {group.isRun && (
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4a4a6a] flex items-center">
                    <span className="w-8 h-px bg-[#1e1e2e] mr-4"></span>
                    Research Run &mdash; {new Date(group.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </h3>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.units.map(unit => (
                    <KnowledgeUnitCard key={unit.id} unit={unit} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

  );
}

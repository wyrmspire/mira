'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { KnowledgeUnit } from '@/types/knowledge';
import { COPY } from '@/lib/studio-copy';

interface KnowledgeCompanionProps {
  domain?: string;
  knowledgeUnitId?: string;
}

export function KnowledgeCompanion({ domain, knowledgeUnitId }: KnowledgeCompanionProps) {
  const [units, setUnits] = useState<KnowledgeUnit[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;

    async function fetchKnowledge() {
      setLoading(true);
      try {
        let url = '/api/knowledge';
        if (domain) {
          url += `?domain=${encodeURIComponent(domain)}`;
        } else if (knowledgeUnitId) {
          // If we have a single ID, we still might want to fetch all in that same domain 
          // or just that single unit depending on the instruction.
          // For now, let's stick to domain-based fetching per Lane 5 requirement.
        }
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          // API returns units grouped by domain or flat depending on implementation.
          // Lane 2 W2 says "Groups results by domain in response", so we extract them.
          if (Array.isArray(data)) {
            setUnits(data);
          } else if (data.domains && typeof data.domains === 'object') {
            // If grouped, flatten for this specific domain
            const domainUnits = domain ? data.domains[domain] : Object.values(data.domains).flat();
            setUnits(domainUnits || []);
          } else {
            setUnits([]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch knowledge:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchKnowledge();
  }, [isExpanded, domain, knowledgeUnitId]);

  if (!domain && !knowledgeUnitId) return null;

  return (
    <div className="mt-8 border border-[#1e1e2e] rounded-lg bg-[#0f0f17] overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1e1e2e]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📖</span>
          <span className="text-sm font-medium text-slate-300">
            {COPY.knowledge.actions.learnMore}
          </span>
          {domain && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {domain}
            </span>
          )}
        </div>
        <span className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          ↓
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-[#1e1e2e] bg-[#0c0c12]">
          {loading ? (
            <div className="py-4 text-center text-sm text-slate-500 animate-pulse">
              {COPY.common.loading}
            </div>
          ) : units.length > 0 ? (
            <div className={`space-y-3 ${units.length > 2 ? 'max-h-[320px] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
              {units.length === 1 ? (
                // Single unit: keep current rendering
                <div className="group">
                  <h4 className="text-sm font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                    {units[0].title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {units[0].thesis}
                  </p>
                  <Link
                    href={`/knowledge/${units[0].id}`}
                    className="text-xs text-blue-400/80 hover:text-blue-400 mt-2 inline-block font-medium"
                  >
                    Read full →
                  </Link>
                </div>
              ) : (
                // Multiple units: compact list
                units.map((unit) => (
                  <div key={unit.id} className="p-3 border border-[#1e1e2e] rounded-lg bg-[#0d0d18] hover:border-blue-500/30 transition-all group shadow-sm">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <h4 className="text-sm font-semibold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-2">
                        {unit.title}
                      </h4>
                      <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-tight border ${getTypeColor(unit.unit_type)} flex-shrink-0`}>
                        {COPY.knowledge.unitTypes[unit.unit_type as keyof typeof COPY.knowledge.unitTypes]}
                      </div>
                    </div>
                    <Link
                      href={`/knowledge/${unit.id}`}
                      className="text-[10px] font-bold uppercase tracking-widest text-blue-400/80 hover:text-blue-400 transition-colors"
                    >
                      Read &rarr;
                    </Link>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-slate-500">
              No specific units found for this domain yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
    case 'audio_script':
      return 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20';
    default:
      return 'text-[#94a3b8] bg-[#1e1e2e] border-[#1e1e2e]';
  }
};

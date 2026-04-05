'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { KnowledgeUnit, MasteryStatus } from '@/types/knowledge';
import { COPY } from '@/lib/studio-copy';
import { ROUTES } from '@/lib/routes';
import MasteryBadge from './MasteryBadge';

interface KnowledgeUnitViewProps {
  unit: KnowledgeUnit;
}

type Tab = 'learn' | 'practice' | 'links';

export default function KnowledgeUnitView({ unit }: KnowledgeUnitViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('learn');
  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const updateMastery = async (status: MasteryStatus) => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/knowledge/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mastery_status: status }),
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to update mastery:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'foundation': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'playbook': return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
      case 'deep_dive': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'example': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'misconception': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-[#94a3b8] bg-[#1e1e2e] border-[#1e1e2e]';
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 md:px-0">
      <Link 
        href={ROUTES.knowledge}
        className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-[#4a4a6a] hover:text-indigo-400 mb-8 transition-colors"
      >
        ← Back to Knowledge
      </Link>

      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getTypeColor(unit.unit_type)}`}>
            {COPY.knowledge.unitTypes[unit.unit_type]}
          </div>
          <MasteryBadge status={unit.mastery_status} />
          <span className="text-[10px] uppercase tracking-widest text-[#4a4a6a] font-bold">
            {unit.domain.replace(/-/g, ' ')}
          </span>
        </div>
        <h1 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight">{unit.title}</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-[#1e1e2e] mb-8 overflow-x-auto no-scrollbar">
        {(['learn', 'practice', 'links'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${
              activeTab === tab ? 'text-indigo-400' : 'text-[#4a4a6a] hover:text-[#94a3b8]'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'learn' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Quick Read Callout */}
            <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-3">Thesis</h3>
              <div className="text-xl text-[#f1f5f9] font-medium leading-relaxed italic prose prose-invert max-w-none">
                <ReactMarkdown>{unit.thesis}</ReactMarkdown>
              </div>
            </div>

            {/* Deep Read Body */}
            <div className="prose prose-invert prose-indigo max-w-none prose-p:leading-relaxed prose-p:text-base prose-headings:mb-4 prose-headings:mt-8">
              <ReactMarkdown>{unit.content}</ReactMarkdown>
            </div>

            {/* Key Ideas */}
            {unit.key_ideas.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-[#f1f5f9] mb-4">Key Ideas</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {unit.key_ideas.map((idea, i) => (
                    <li key={i} className="p-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl text-sm text-[#94a3b8] flex items-start">
                      <span className="text-indigo-400 mr-3 mt-1 leading-none">•</span>
                      {idea}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Common Mistake */}
            {unit.common_mistake && (
              <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-500 text-lg">⚠️</span>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500">Common Mistake</h3>
                </div>
                <p className="text-sm text-[#e2e8f0] leading-relaxed italic">
                  {unit.common_mistake}
                </p>
              </div>
            )}

            {/* Action Prompt */}
            {unit.action_prompt && (
              <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-emerald-500 text-lg">⚡</span>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500">Action Prompt</h3>
                </div>
                <p className="text-[#f1f5f9] font-semibold">
                  {unit.action_prompt}
                </p>
              </div>
            )}

            {/* Citations */}
            {unit.citations.length > 0 && (
              <section className="pt-8 border-t border-[#1e1e2e]">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a6a] mb-4">Citations & Proof</h2>
                <div className="space-y-3">
                  {unit.citations.map((cite, i) => (
                    <a 
                      key={i} 
                      href={cite.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-4 border border-[#1e1e2e] rounded-xl hover:bg-[#12121e] transition-colors group"
                    >
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-[#94a3b8] group-hover:text-[#e2e8f0] transition-colors line-clamp-1">
                          {cite.claim}
                        </p>
                        <span className="text-[10px] text-indigo-400 font-mono">
                          {Math.round(cite.confidence * 100)}% Match
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'practice' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {unit.retrieval_questions.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-4">
                  {unit.retrieval_questions.map((q, i) => (
                    <div 
                      key={i} 
                      className="bg-[#0d0d18] border border-[#1e1e2e] rounded-xl overflow-hidden"
                    >
                      <button 
                        onClick={() => toggleQuestion(i)}
                        className="w-full p-5 text-left flex justify-between items-center hover:bg-[#12121e] transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className={`text-[9px] font-bold uppercase tracking-tighter mb-1 ${
                            q.difficulty === 'easy' ? 'text-emerald-400' : 
                            q.difficulty === 'medium' ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {q.difficulty}
                          </span>
                          <span className="text-sm font-bold text-[#f1f5f9]">{q.question}</span>
                        </div>
                        <span className={`text-[#4a4a6a] transition-transform duration-300 ${expandedQuestions.includes(i) ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </button>
                      {expandedQuestions.includes(i) && (
                        <div className="px-5 pb-5 pt-2 border-t border-[#1e1e2e] animate-in slide-in-from-top-1 duration-200">
                          <p className="text-sm text-[#94a3b8] leading-relaxed">
                            {q.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="pt-10 flex flex-col items-center">
                  <p className="text-xs text-[#4a4a6a] mb-4 text-center">
                    Attempting these retrieval questions solidifies memory.
                  </p>
                  <button 
                    onClick={() => updateMastery('practiced')}
                    disabled={isUpdating}
                    className="px-6 py-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-amber-500/20 transition-all disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : COPY.knowledge.actions.markPracticed}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-[#4a4a6a]">
                <p>No practice questions for this unit.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'links' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Related Experiences */}
            {unit.linked_experience_ids.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-[#f1f5f9] mb-6">Active Context</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unit.linked_experience_ids.map((id) => (
                    <Link 
                      key={id}
                      href={ROUTES.workspace(id)}
                      className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl hover:bg-indigo-500/10 transition-colors group"
                    >
                      <h4 className="text-sm font-bold text-[#e2e8f0] mb-2 group-hover:text-indigo-300">Continue Related Journey</h4>
                      <p className="text-[10px] uppercase tracking-widest text-[#4a4a6a] font-bold">Go to Workspace →</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Subtopic Seeds */}
            {unit.subtopic_seeds.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-[#f1f5f9] mb-4">Explore Next</h2>
                <div className="flex flex-wrap gap-2">
                  {unit.subtopic_seeds.map((seed, i) => (
                    <span 
                      key={i} 
                      className="px-3 py-1.5 bg-[#0d0d18] border border-[#1e1e2e] rounded-full text-xs text-[#94a3b8] font-medium"
                    >
                      {seed}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs text-[#4a4a6a]">
                  These topics have been identified by Mira as your next logical research horizons.
                </p>
              </section>
            )}

            {/* Source Experience Link */}
            {unit.source_experience_id && (
              <section className="p-6 bg-[#00000022] border border-dashed border-[#1e1e2e] rounded-2xl">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#4a4a6a] mb-2">Genesis</h4>
                <p className="text-sm text-[#94a3b8] mb-4">
                  This knowledge unit was synthesized from your participation in an experience.
                </p>
                <Link 
                  href={ROUTES.workspace(unit.source_experience_id)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
                >
                  View Source Experience →
                </Link>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Persistent Mastery Controls */}
      <footer className="mt-20 pt-10 border-t border-[#1e1e2e] flex flex-wrap justify-center gap-4">
        {unit.mastery_status !== 'read' && (
          <button 
            onClick={() => updateMastery('read')}
            disabled={isUpdating}
            className="px-6 py-3 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-sky-500/20 transition-all disabled:opacity-50"
          >
            {COPY.knowledge.actions.markRead}
          </button>
        )}
        {unit.mastery_status !== 'practiced' && (
          <button 
            onClick={() => updateMastery('practiced')}
            disabled={isUpdating}
            className="px-6 py-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-500/20 transition-all disabled:opacity-50"
          >
            {COPY.knowledge.actions.markPracticed}
          </button>
        )}
        {unit.mastery_status !== 'confident' && (
          <button 
            onClick={() => updateMastery('confident')}
            disabled={isUpdating}
            className="px-6 py-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all disabled:opacity-50"
          >
            {COPY.knowledge.actions.markConfident}
          </button>
        )}
      </footer>
    </div>
  );
}

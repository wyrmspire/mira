'use client';

import React, { useState } from 'react';
import { ExperienceStep, ExperienceBlock } from '@/types/experience';
import ReactMarkdown from 'react-markdown';
import { StepKnowledgeCard } from '../StepKnowledgeCard';
import BlockRenderer from '../blocks/BlockRenderer';

interface ChallengePayload {
  objectives?: Array<{
    id: string;
    description: string;
    proof?: string;
  }>;
  blocks?: ExperienceBlock[];
}

interface ChallengeStepProps {
  step: ExperienceStep;
  onComplete: (payload: { completedObjectives: Record<string, string> }) => void;
  onSkip: () => void;
  onDraft?: (draft: Record<string, any>) => void;
}

export default function ChallengeStep({ step, onComplete, onSkip, onDraft }: ChallengeStepProps) {
  const [completed, setCompleted] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const payload = step.payload as ChallengePayload | null;
  const objectives = payload?.objectives ?? [];
  const blocks = payload?.blocks ?? [];
  const hasBlocks = blocks.length > 0;

  const handleBlur = (objectiveId: string) => {
    if (onDraft && completed[objectiveId]) {
      onDraft({ objectiveId, proof: completed[objectiveId] });
    }
  };

  const completedCount = Object.values(completed).filter(v => !!v.trim()).length;
  const totalCount = objectives.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ completedObjectives: completed });
  };

  const canComplete = totalCount === 0 || percent >= 60;
  const isPerfect = percent === 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{step.title}</h2>
          <p className="text-xs text-amber-400 p-1 px-3 bg-amber-400/10 rounded-full border border-amber-400/20 inline-block uppercase tracking-widest font-bold">
            Active Challenge
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-amber-400">{percent}%</span>
          <span className="block text-[10px] text-[#475569] font-mono">COMPLETE</span>
        </div>
      </div>

      <div className="h-1.5 w-full bg-[#1e1e2e] rounded-full overflow-hidden mb-12 border border-[#33334d]">
        <div 
          className="h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      
      {/* Lane 5: Pre-support Knowledge */}
      {step.knowledge_links?.filter(l => l.linkType === 'pre_support').map(link => (
        <StepKnowledgeCard 
          key={link.id} 
          knowledgeUnitId={link.knowledgeUnitId} 
          linkType={link.linkType} 
          timing="pre" 
        />
      ))}

      {/* Lane 5: In-step Knowledge (teaches/enrichment) */}
      {step.knowledge_links?.filter(l => l.linkType === 'teaches' || l.linkType === 'enrichment').map(link => (
        <StepKnowledgeCard 
          key={link.id} 
          knowledgeUnitId={link.knowledgeUnitId} 
          linkType={link.linkType} 
          timing="in" 
        />
      ))}

      <form onSubmit={handleSubmit} className="space-y-6">
        {hasBlocks ? (
          <div className="space-y-10">
            {blocks.map((block, idx) => (
              <BlockRenderer 
                key={block.id || idx} 
                block={block} 
                instanceId={step.instance_id}
                stepId={step.id}
              />
            ))}
          </div>
        ) : (
          <>
            {objectives.length === 0 && (
              <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
                <p className="text-[#64748b] text-lg">Challenge objectives are being prepared.</p>
              </div>
            )}
            {objectives.map((obj, idx) => {
              const isDone = !!completed[obj.id]?.trim();
              const isExpanded = expandedId === obj.id;
              return (
                <div
                  key={obj.id}
                  className={`p-6 rounded-2xl border transition-all duration-500 group cursor-pointer ${
                    isDone
                      ? 'bg-emerald-500/5 border-emerald-500/30'
                      : isExpanded
                        ? 'bg-[#1a1a2e] border-amber-500/40 shadow-lg'
                        : 'bg-[#12121a] border-[#1e1e2e] hover:border-amber-500/20'
                  }`}
                  onClick={() => setExpandedId(isExpanded ? null : obj.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all flex-shrink-0 ${
                      isDone
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 rotate-[360deg]'
                        : 'bg-[#1a1a2e] border-[#33334d] text-[#475569] group-hover:border-amber-500/30'
                    }`}>
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`prose prose-invert prose-indigo max-w-none prose-p:text-lg prose-p:font-medium prose-p:leading-normal prose-strong:text-amber-300 prose-code:text-amber-300 transition-all ${
                        isDone ? 'prose-p:text-emerald-400/70 prose-p:line-through' : 'prose-p:text-[#e2e8f0]'
                      }`}>
                        <ReactMarkdown>{obj.description}</ReactMarkdown>
                      </div>
                      
                      {isExpanded && (
                        <div 
                          className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {obj.proof && (
                            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                              <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Requirement</p>
                              <div className="prose prose-invert prose-indigo max-w-none prose-p:text-sm prose-p:text-[#94a3b8] prose-p:italic prose-strong:text-amber-300 prose-code:text-amber-200">
                                <ReactMarkdown>{obj.proof}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-[#475569] uppercase tracking-[0.2em] ml-1">Record Evidence</label>
                            <textarea
                              value={completed[obj.id] || ''}
                              onChange={(e) => setCompleted((prev) => ({ ...prev, [obj.id]: e.target.value }))}
                              onBlur={() => handleBlur(obj.id)}
                              placeholder="What did you achieve? Paste results or describe your progress…"
                              rows={6}
                              className={`w-full bg-[#0a0a0f] border rounded-xl px-5 py-4 text-[#e2e8f0] placeholder-[#94a3b8]/10 focus:outline-none transition-all ${
                                isDone ? 'border-emerald-500/20 focus:border-emerald-500/40' : 'border-[#1e1e2e] focus:border-amber-500/40'
                              }`}
                              style={{ minHeight: '150px', maxHeight: '500px' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {!isExpanded && (
                      <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <svg className="w-5 h-5 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Lane 5: Post-step Knowledge (deepens) */}
        {(hasBlocks || canComplete) && step.knowledge_links?.filter(l => l.linkType === 'deepens').map(link => (
          <StepKnowledgeCard 
            key={link.id} 
            knowledgeUnitId={link.knowledgeUnitId} 
            linkType={link.linkType} 
            timing="post" 
          />
        ))}

        <div className="flex items-center justify-between pt-8 border-t border-[#1e1e2e]">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Skip for now
          </button>
          
          <div className="flex flex-col items-end gap-3">
            {!hasBlocks && canComplete && !isPerfect && (
              <p className="text-[10px] text-amber-500/70 font-mono tracking-tighter">
                PARTIAL COMPLETION ENABLED (≥60%)
              </p>
            )}
            {!hasBlocks && !canComplete && (
              <p className="text-[10px] text-rose-500/70 font-mono tracking-tighter uppercase font-bold">
                Complete {Math.ceil(totalCount * 0.6) - completedCount} more to finish
              </p>
            )}
            <button
              type="submit"
              disabled={!hasBlocks && !canComplete}
              className={`px-10 py-4 rounded-xl text-sm font-bold transition-all shadow-xl active:scale-95 border ${
                hasBlocks ? 'bg-amber-500 text-[#0a0a0f] border-amber-400 shadow-amber-500/20 hover:bg-amber-400' :
                canComplete 
                  ? 'bg-amber-500 text-[#0a0a0f] border-amber-400 shadow-amber-500/20 hover:bg-amber-400' 
                  : 'bg-amber-500/10 text-amber-500/30 border-amber-500/10 cursor-not-allowed opacity-50'
              }`}
            >
              {hasBlocks ? 'Finish Step →' : isPerfect ? 'Challenge Complete →' : 'Finish Challenge Anyway →'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

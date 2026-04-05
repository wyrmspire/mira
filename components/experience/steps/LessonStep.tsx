'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { ExperienceStep } from '@/types/experience';
import ReactMarkdown from 'react-markdown';
import { StepKnowledgeCard } from '../StepKnowledgeCard';

interface LessonPayload {
  sections: Array<{
    heading?: string;
    body: string;
    type?: 'text' | 'callout' | 'checkpoint';
  }>;
}

interface LessonStepProps {
  step: ExperienceStep;
  onComplete: () => void;
  onSkip: () => void;
  onDraft?: (draft: Record<string, any>) => void;
}

export default function LessonStep({ step, onComplete, onSkip, onDraft }: LessonStepProps) {
  const [checkpoints, setCheckpoints] = useState<Record<number, boolean>>({});
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [readSections, setReadSections] = useState<Record<number, boolean>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const payload = step.payload as LessonPayload | null;
  const sections = payload?.sections ?? [];

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            setReadSections((prev) => ({ ...prev, [index]: true }));
          }
        });
      },
      { threshold: 0.5 }
    );

    return () => observerRef.current?.disconnect();
  }, []);

  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    sectionRefs.current.forEach((ref) => {
      if (ref && observerRef.current) {
        observerRef.current.observe(ref);
      }
    });
  }, [sections]);

  const isRespondMode = (body: string) => {
    const keywords = ['write', 'describe', 'explain', 'list', 'draft'];
    return keywords.some(keyword => body.toLowerCase().includes(keyword));
  };

  const handleCheckpoint = (index: number) => {
    setCheckpoints((prev) => ({ ...prev, [index]: true }));
  };

  const handleResponseSubmit = (index: number) => {
    if (!responses[index]?.trim()) return;
    setCheckpoints((prev) => ({ ...prev, [index]: true }));
    if (onDraft) {
      onDraft({ checkpointIndex: index, response: responses[index] });
    }
  };

  const allCheckpointsDone = sections.every(
    (s, i) => s.type !== 'checkpoint' || checkpoints[i]
  );
  
  const allSectionsRead = sections.length === 0 || sections.every((_, i) => readSections[i]);
  const isComplete = allCheckpointsDone && allSectionsRead;

  const readPercent = sections.length > 0 
    ? Math.round((Object.keys(readSections).length / sections.length) * 100) 
    : 100;

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-10 fade-in duration-700 max-w-2xl mx-auto">
      <div className="flex justify-between items-end border-b border-[#1e1e2e] pb-6 sticky top-0 bg-[#0a0a0f]/80 backdrop-blur-md z-10 pt-4">
        <div>
          <h2 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight">{step.title}</h2>
          <p className="text-sm text-indigo-400 font-mono mt-1">READING PROGRESS: {readPercent}%</p>
        </div>
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

      <div className="space-y-16">
        {sections.length === 0 && (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b] text-lg">This lesson is being prepared.</p>
          </div>
        )}
        {sections.map((section, idx) => (
          <div 
            key={idx} 
            data-index={idx}
            ref={(el) => (sectionRefs.current[idx] = el) as any}
            className={`transition-opacity duration-700 ${readSections[idx] ? 'opacity-100' : 'opacity-40'}`}
          >
            {section.type === 'callout' ? (
              <div className="p-8 bg-indigo-500/5 border-l-4 border-indigo-500 rounded-r-2xl shadow-[0_0_30px_rgba(99,102,241,0.05)]">
                {section.heading && (
                  <h3 className="text-indigo-300 font-bold uppercase tracking-wider text-xs mb-4">Key Insight</h3>
                )}
                <div className="prose prose-invert prose-indigo max-w-none prose-p:text-[#e2e8f0] prose-p:leading-relaxed prose-p:text-xl prose-p:font-medium prose-strong:text-indigo-300 prose-code:text-amber-300 prose-blockquote:border-indigo-500/30">
                  <ReactMarkdown>{section.body}</ReactMarkdown>
                </div>
              </div>
            ) : section.type === 'checkpoint' ? (
              <div className={`p-8 rounded-2xl border transition-all duration-500 ${
                checkpoints[idx] 
                  ? 'bg-emerald-500/5 border-emerald-500/30' 
                  : 'bg-[#12121a] border-[#1e1e2e]'
              }`}>
                {section.heading && <h3 className="text-xl font-bold text-[#f1f5f9] mb-4">{section.heading}</h3>}
                <div className="prose prose-invert prose-indigo max-w-none prose-p:text-lg prose-p:text-[#94a3b8] prose-p:leading-relaxed mb-8 prose-strong:text-indigo-300 prose-code:text-amber-300 prose-blockquote:border-indigo-500/30">
                  <ReactMarkdown>{section.body}</ReactMarkdown>
                </div>
                
                <div className="flex flex-col items-center gap-6">
                  {checkpoints[idx] ? (
                    <div className="flex items-center gap-3 text-emerald-400 font-bold bg-emerald-500/10 px-6 py-3 rounded-full border border-emerald-500/20">
                      <span className="w-6 h-6 rounded-full bg-emerald-400 text-[#0a0a0f] flex items-center justify-center text-xs">✓</span>
                      {isRespondMode(section.body) ? 'Response Recorded' : 'Concept Confirmed'}
                    </div>
                  ) : isRespondMode(section.body) ? (
                    <div className="w-full space-y-4">
                      <div className="relative">
                        <textarea
                          value={responses[idx] || ''}
                          onChange={(e) => setResponses({ ...responses, [idx]: e.target.value })}
                          placeholder="Type your response here…"
                          rows={4}
                          className="w-full bg-[#0d0d12] border border-[#1e1e2e] rounded-xl px-5 py-4 text-[#e2e8f0] placeholder-[#94a3b8]/30 focus:outline-none focus:border-indigo-500/40 transition-all resize-none text-lg"
                        />
                        <div className="absolute bottom-4 right-4 text-[10px] font-mono text-[#475569]">
                          {(responses[idx]?.trim().split(/\s+/).filter(Boolean).length || 0)} WORDS
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleResponseSubmit(idx)}
                          disabled={!responses[idx]?.trim()}
                          className="px-8 py-3 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all font-bold disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
                        >
                          Submit Response
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCheckpoint(idx)}
                      className="px-8 py-3 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/40 hover:bg-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all font-bold"
                    >
                      I Understand
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {/* Lane 5: In-step Knowledge (teaches/enrichment) */}
            {step.knowledge_links?.filter(l => 
              (l.linkType === 'teaches' || l.linkType === 'enrichment') && 
              // This is a simple heuristic: if it's placed near this section
              // In this case, we'll just render it after the section if it exists
              // Ideally the links would be indexed to sections, but for now we render them all
              // at the first section for visibility.
              idx === 0
            ).map(link => (
              <StepKnowledgeCard 
                key={link.id} 
                knowledgeUnitId={link.knowledgeUnitId} 
                linkType={link.linkType} 
                timing="in" 
              />
            ))}

            {section.type !== 'callout' && section.type !== 'checkpoint' && (
              <div className="space-y-4">
                {section.heading && (
                  <h3 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">{section.heading}</h3>
                )}
                <div className="prose prose-invert prose-lg prose-indigo max-w-none prose-headings:text-[#e2e8f0] prose-p:text-[#94a3b8] prose-p:leading-[1.8] prose-strong:text-indigo-300 prose-code:text-amber-300 prose-a:text-indigo-400 prose-blockquote:border-indigo-500/30 prose-li:text-[#94a3b8]">
                  <ReactMarkdown>{section.body}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Lane 5: Post-step Knowledge (deepens) */}
        {isComplete && step.knowledge_links?.filter(l => l.linkType === 'deepens').map(link => (
          <StepKnowledgeCard 
            key={link.id} 
            knowledgeUnitId={link.knowledgeUnitId} 
            linkType={link.linkType} 
            timing="post" 
          />
        ))}

        <div className="flex items-center justify-between pt-10 border-t border-[#1e1e2e]">
          <button
            onClick={onSkip}
            className="text-sm font-medium text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Skip for now
          </button>
          
          <div className="flex flex-col items-end gap-3">
            {!isComplete && (
              <p className="text-xs text-amber-500/70 font-mono">
                {!allSectionsRead ? 'SCROLL TO BOTTOM' : 'CONFIRM ALL CHECKPOINTS'}
              </p>
            )}
            <button
              onClick={() => onComplete()}
              disabled={!isComplete}
              className="px-12 py-4 bg-indigo-500 text-white rounded-xl text-sm font-extrabold hover:bg-indigo-600 transition-all disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed shadow-xl shadow-indigo-500/20 active:scale-95"
            >
              Continue Journey →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

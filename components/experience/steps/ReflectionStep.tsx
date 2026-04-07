'use client';

import React, { useState } from 'react';
import { ExperienceStep, ExperienceBlock } from '@/types/experience';
import ReactMarkdown from 'react-markdown';
import BlockRenderer from '../blocks/BlockRenderer';

interface ReflectionPayload {
  prompts?: Array<{
    id: string;
    text: string;
    format?: 'free_text';
  }>;
  blocks?: ExperienceBlock[];
}

interface ReflectionStepProps {
  step: ExperienceStep;
  onComplete: (payload: { reflections: Record<string, string> }) => void;
  onSkip: () => void;
  onDraft?: (draft: Record<string, any>) => void;
  readOnly?: boolean;
  initialResponses?: Record<string, string>;
}

export default function ReflectionStep({ step, onComplete, onSkip, onDraft, readOnly, initialResponses }: ReflectionStepProps) {
  const [responses, setResponses] = useState<Record<string, string>>(initialResponses || {});
  const payload = step.payload as ReflectionPayload | null;
  const prompts = payload?.prompts ?? [];
  const blocks = payload?.blocks ?? [];
  const hasBlocks = blocks.length > 0;

  const handleChange = (promptId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [promptId]: value }));
  };

  const handleBlur = (promptId: string) => {
    if (onDraft && responses[promptId]) {
      onDraft({ [promptId]: responses[promptId] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ reflections: responses });
  };

  const isComplete = prompts.length === 0 || prompts.every((p) => !!responses[p.id]?.trim());

  if (readOnly) {
    return (
      <div className="space-y-12 animate-in fade-in duration-700 max-w-2xl mx-auto">
        <div className="border-l-4 border-violet-500 pl-6 mb-12">
          <h2 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight mb-2">{step.title}</h2>
          <p className="text-sm text-violet-400 uppercase tracking-[0.2em] font-bold">Past Perspective</p>
        </div>
        
        <div className="space-y-16">
          {hasBlocks && (
            <div className="space-y-10">
              {blocks.map((block, idx) => (
                <BlockRenderer key={block.id || idx} block={block} />
              ))}
            </div>
          )}
          
          <div className="space-y-10">
            {prompts.map((p) => (
              <div key={p.id} className="space-y-6">
                <div className="prose prose-invert prose-indigo max-w-none prose-p:text-xl prose-p:font-bold prose-p:text-[#475569] prose-p:leading-relaxed">
                  <ReactMarkdown>{p.text}</ReactMarkdown>
                </div>
                <div className="p-8 bg-violet-500/5 border-l-2 border-violet-500/30 rounded-r-2xl italic">
                  <p className="text-2xl text-[#e2e8f0] font-serif leading-[1.8] whitespace-pre-wrap">
                    "{responses[p.id] || 'No reflection logged.'}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-2xl mx-auto">
      <div className="mb-8 border-l-4 border-violet-500 pl-6">
        <h2 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight mb-2">{step.title}</h2>
        <p className="text-sm text-violet-400 uppercase tracking-[0.2em] font-bold">Reflection Process</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-16">
        {hasBlocks && (
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
        )}

        <div className="space-y-10">
          {prompts.length === 0 && !hasBlocks && (
            <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
              <p className="text-[#64748b] text-lg">Reflection prompts are being prepared.</p>
            </div>
          )}
          {prompts.map((prompt, idx) => {
            const wordCount = responses[prompt.id]?.trim().split(/\s+/).filter(Boolean).length || 0;
            return (
              <div 
                key={prompt.id} 
                className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
                style={{ animationDelay: `${idx * 150}ms`, animationFillMode: 'both' }}
              >
                <div className="flex justify-between items-end">
                  <div className="prose prose-invert prose-indigo max-w-none prose-p:text-xl prose-p:font-semibold prose-p:text-[#e2e8f0] prose-p:leading-relaxed max-w-[80%]">
                    <ReactMarkdown>{prompt.text}</ReactMarkdown>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded transition-colors ${
                    wordCount > 0 ? 'text-violet-400 bg-violet-400/10' : 'text-[#475569] bg-[#1a1a2e]'
                  }`}>
                    {wordCount} WORDS
                  </span>
                </div>
                
                <div className="relative">
                  <textarea
                    value={responses[prompt.id] || ''}
                    onChange={(e) => handleChange(prompt.id, e.target.value)}
                    onBlur={() => handleBlur(prompt.id)}
                    placeholder="Share your thoughts honestly…"
                    rows={5}
                    className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-2xl px-6 py-5 text-lg text-[#f1f5f9] placeholder-[#94a3b8]/20 focus:outline-none focus:border-violet-500/40 focus:bg-[#161625] transition-all resize-none leading-relaxed shadow-inner"
                  />
                  <div className="absolute bottom-4 right-4 flex gap-2">
                     {responses[prompt.id] && (
                       <span className="text-[10px] text-emerald-400/50 font-mono animate-pulse">DRAFT SAVED</span>
                     )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-10 border-t border-[#1e1e2e]">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Skip for now
          </button>
          
          <div className="flex flex-col items-end gap-3">
            {!isComplete && (
               <p className="text-[10px] text-violet-400/70 font-mono tracking-widest">
                 AWAITING YOUR INSIGHTS
               </p>
            )}
            <button
              type="submit"
              disabled={!hasBlocks && !isComplete}
              className="px-12 py-4 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-500 transition-all disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed shadow-xl shadow-violet-900/20 active:scale-95"
            >
              Finish Reflection →
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

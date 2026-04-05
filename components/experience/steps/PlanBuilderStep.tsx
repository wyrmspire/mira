'use client';

import React, { useState } from 'react';
import { ExperienceStep, ExperienceBlock } from '@/types/experience';
import ReactMarkdown from 'react-markdown';
import BlockRenderer from '../blocks/BlockRenderer';

interface PlanBuilderPayload {
  sections?: Array<{
    type: 'goals' | 'milestones' | 'resources';
    items: any[];
  }>;
  blocks?: ExperienceBlock[];
}

interface PlanBuilderStepProps {
  step: ExperienceStep;
  onComplete: (payload: { acknowledged: boolean; sections?: any[] }) => void;
  onSkip: () => void;
  onDraft?: (draft: Record<string, any>) => void;
}

export default function PlanBuilderStep({ step, onComplete, onSkip, onDraft }: PlanBuilderStepProps) {
  const payload = step.payload as PlanBuilderPayload | null;
  const initialSections = payload?.sections ?? [];
  const blocks = payload?.blocks ?? [];
  const hasBlocks = blocks.length > 0;
  
  const [sections, setSections] = useState(initialSections);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expandedIdx, setExpandedIdx] = useState<string | null>(null);

  const sectionIcons: Record<string, string> = {
    goals: '🎯',
    milestones: '📍',
    resources: '📦',
  };

  const sectionLabels: Record<string, string> = {
    goals: 'Goals',
    milestones: 'Milestones',
    resources: 'Resources',
  };

  const handleNotesBlur = (key: string) => {
    if (onDraft && notes[key]) {
      onDraft({ itemKey: key, notes: notes[key] });
    }
  };

  const toggleCheck = (sectionIdx: number, itemIdx: number) => {
    const key = `${sectionIdx}-${itemIdx}`;
    const newState = { ...checked, [key]: !checked[key] };
    setChecked(newState);
    if (onDraft) {
      onDraft({ checked: newState, sections, notes });
    }
  };

  const moveItem = (sectionIdx: number, itemIdx: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const section = { ...newSections[sectionIdx] };
    const items = [...section.items];
    
    const targetIdx = direction === 'up' ? itemIdx - 1 : itemIdx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    
    [items[itemIdx], items[targetIdx]] = [items[targetIdx], items[itemIdx]];
    section.items = items;
    newSections[sectionIdx] = section;
    setSections(newSections);
    
    // Adjust checked state for moved items
    const currentKey = `${sectionIdx}-${itemIdx}`;
    const targetKey = `${sectionIdx}-${targetIdx}`;
    const newChecked = { ...checked };
    const currentVal = !!checked[currentKey];
    const targetVal = !!checked[targetKey];
    newChecked[currentKey] = targetVal;
    newChecked[targetKey] = currentVal;
    setChecked(newChecked);

    if (onDraft) {
      onDraft({ checked: newChecked, sections: newSections });
    }
  };

  const addItem = (sectionIdx: number) => {
    const newSections = [...sections];
    const section = { ...newSections[sectionIdx] };
    const newItem = {
      id: crypto.randomUUID(),
      text: 'New action item'
    };
    section.items = [...section.items, newItem];
    newSections[sectionIdx] = section;
    setSections(newSections);
  };

  const handleComplete = () => {
    onComplete({ acknowledged: true, sections });
  };

  const allItems = (sections || []).flatMap((s, si) =>
    (s.items || []).map((_, ii) => `${si}-${ii}`)
  );
  const allChecked = allItems.length === 0 || allItems.every((key) => !!checked[key]);

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-10 fade-in duration-700 max-w-3xl mx-auto">
      <div className="border-b border-[#1e1e2e] pb-6">
        <h2 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight mb-2">{step.title}</h2>
        <p className="text-sm text-cyan-400 uppercase tracking-widest font-bold">Execution Plan</p>
      </div>

      <div className="space-y-10">
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
            {sections.length === 0 && (
              <div className="p-12 border border-dashed border-[#33334d] rounded-2xl text-center bg-[#12121a]/50">
                <p className="text-[#64748b] text-lg">No plan sections defined yet.</p>
              </div>
            )}
            
            {(sections || []).map((section, sIdx) => {
              const sectionCheckedCount = (section.items || []).filter((_, iIdx) => checked[`${sIdx}-${iIdx}`]).length;
              const sectionTotal = (section.items || []).length;
              const isSectionDone = sectionTotal > 0 && sectionCheckedCount === sectionTotal;

              return (
                <div key={sIdx} className="space-y-6">
                  <div className="flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{sectionIcons[section.type] || '•'}</span>
                      <h3 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">
                        {sectionLabels[section.type] || section.type}
                      </h3>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                        isSectionDone 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                          : 'bg-[#1a1a2e] border-[#33334d] text-[#475569]'
                      }`}>
                        {sectionCheckedCount} / {sectionTotal} READY
                      </div>
                    </div>
                    <button 
                      onClick={() => addItem(sIdx)}
                      className="opacity-0 group-hover:opacity-100 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-all px-3 py-1 rounded-lg border border-cyan-400/20 bg-cyan-400/5 shadow-sm"
                    >
                      + ADD ITEM
                    </button>
                  </div>

                  <div className="grid gap-4">
                    {(section.items || []).map((item, iIdx) => {
                      const key = `${sIdx}-${iIdx}`;
                      const label = typeof item === 'string' ? item : item.text || item.title || item.description || 'Untitled';
                      const subtitle = typeof item === 'object' && (item as any).target_date ? `Target: ${(item as any).target_date}` : null;

                      return (
                        <div
                          key={key}
                          className={`group/item flex flex-col p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                            checked[key]
                              ? 'bg-emerald-500/5 border-emerald-500/20 translate-x-1'
                              : expandedIdx === key
                                ? 'bg-[#1a1a2e] border-cyan-500/40 shadow-lg'
                                : 'bg-[#12121a] border-[#1e1e2e] hover:border-cyan-500/30'
                          }`}
                          onClick={() => setExpandedIdx(expandedIdx === key ? null : key)}
                        >
                          <div className="flex items-center gap-4">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCheck(sIdx, iIdx); }}
                              className={`flex-shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                                checked[key]
                                  ? 'bg-emerald-500 border-emerald-500 text-[#0a0a0f]'
                                  : 'bg-transparent border-[#33334d] hover:border-cyan-500/50'
                              }`}
                            >
                              {checked[key] && <span className="text-[14px]">✓</span>}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                              <div className={`prose prose-invert prose-indigo max-w-none prose-p:font-semibold transition-all ${
                                checked[key] ? 'prose-p:text-emerald-400/60 prose-p:line-through' : 'prose-p:text-[#f1f5f9]'
                              }`}>
                                <ReactMarkdown>{label}</ReactMarkdown>
                              </div>
                              {subtitle && (
                                <p className="text-sm text-[#475569] mt-0.5">{subtitle}</p>
                              )}
                            </div>

                            <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => moveItem(sIdx, iIdx, 'up')}
                                disabled={iIdx === 0}
                                className="p-1.5 text-[#475569] hover:text-cyan-400 disabled:opacity-10 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"></path></svg>
                              </button>
                              <button
                                onClick={() => moveItem(sIdx, iIdx, 'down')}
                                disabled={iIdx === section.items.length - 1}
                                className="p-1.5 text-[#475569] hover:text-cyan-400 disabled:opacity-10 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                              </button>
                            </div>
                          </div>

                          {expandedIdx === key && (
                            <div 
                              className="mt-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <label className="text-[10px] font-bold text-[#475569] uppercase tracking-[0.2em] ml-1">Notes</label>
                              <textarea
                                value={notes[key] || ''}
                                onChange={(e) => setNotes({ ...notes, [key]: e.target.value })}
                                onBlur={() => handleNotesBlur(key)}
                                placeholder="Add implementation notes, risks, or resources…"
                                rows={4}
                                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-4 py-3 text-sm text-[#e2e8f0] placeholder-[#94a3b8]/10 focus:outline-none focus:border-cyan-500/40 transition-all resize-none"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}

        <div className="flex items-center justify-between pt-10 border-t border-[#1e1e2e]">
          <button
            onClick={onSkip}
            className="text-sm font-medium text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Skip for now
          </button>
          
          <div className="flex flex-col items-end gap-3">
             {!allChecked && (
               <p className="text-[10px] text-cyan-400/70 font-mono tracking-widest">
                 CONFIRM ALL ITEMS TO COMMIT
               </p>
             )}
            <button
              onClick={handleComplete}
              disabled={!hasBlocks && !allChecked}
              className="px-12 py-4 bg-cyan-500 text-[#0a0a0f] rounded-xl text-sm font-extrabold hover:bg-cyan-400 transition-all shadow-xl shadow-cyan-500/20 active:scale-95 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
            >
              {hasBlocks ? 'Finish Step →' : 'Commit to Plan →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

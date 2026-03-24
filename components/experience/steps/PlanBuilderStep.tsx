'use client';

import React, { useState } from 'react';
import type { ExperienceStep } from '@/types/experience';

interface PlanBuilderPayload {
  sections: Array<{
    type: 'goals' | 'milestones' | 'resources';
    items: any[];
  }>;
}

interface PlanBuilderStepProps {
  step: ExperienceStep;
  onComplete: (payload: { acknowledged: boolean }) => void;
  onSkip: () => void;
}

export default function PlanBuilderStep({ step, onComplete, onSkip }: PlanBuilderStepProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const payload = step.payload as PlanBuilderPayload;

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

  const allItems = payload.sections.flatMap((s, si) =>
    s.items.map((item, ii) => `${si}-${ii}`)
  );
  const allChecked = allItems.every((key) => checked[key]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{step.title}</h2>
        <p className="text-sm text-cyan-400/70 uppercase tracking-widest font-bold">Plan Builder</p>
      </div>

      <div className="space-y-8">
        {payload.sections.map((section, si) => (
          <div key={si} className="space-y-3">
            <h3 className="text-lg font-semibold text-[#e2e8f0] flex items-center gap-2">
              <span>{sectionIcons[section.type] || '•'}</span>
              {sectionLabels[section.type] || section.type}
            </h3>

            <div className="space-y-2">
              {section.items.map((item, ii) => {
                const key = `${si}-${ii}`;
                const label = typeof item === 'string' ? item : item.title || item.description || JSON.stringify(item);
                const subtitle = typeof item === 'object' && item.target_date ? `Target: ${item.target_date}` : null;

                return (
                  <button
                    key={key}
                    onClick={() => setChecked((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all ${
                      checked[key]
                        ? 'bg-cyan-500/5 border-cyan-500/30'
                        : 'bg-[#12121a] border-[#1e1e2e] hover:border-[#33334d]'
                    }`}
                  >
                    <span className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center text-xs border ${
                      checked[key]
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                        : 'bg-[#1a1a2e] border-[#33334d] text-transparent'
                    }`}>
                      ✓
                    </span>
                    <div>
                      <span className="text-[#e2e8f0] font-medium">{label}</span>
                      {subtitle && <span className="block text-xs text-[#64748b] mt-0.5">{subtitle}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#1e1e2e]">
        <button
          onClick={onSkip}
          className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
        >
          Skip for now
        </button>
        <button
          onClick={() => onComplete({ acknowledged: true })}
          disabled={!allChecked}
          className="px-8 py-3 bg-cyan-500/20 text-cyan-300 rounded-xl text-sm font-bold hover:bg-cyan-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-cyan-500/20"
        >
          Plan Reviewed →
        </button>
      </div>
    </div>
  );
}

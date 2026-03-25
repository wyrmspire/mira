'use client';

import React, { useState } from 'react';
import type { ExperienceStep } from '@/types/experience';

interface EssayTasksPayload {
  content: string;
  tasks: Array<{
    id: string;
    description: string;
  }>;
}

interface EssayTasksStepProps {
  step: ExperienceStep;
  onComplete: (payload: { completedTasks: Record<string, boolean> }) => void;
  onSkip: () => void;
}

export default function EssayTasksStep({ step, onComplete, onSkip }: EssayTasksStepProps) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const payload = step.payload as EssayTasksPayload | null;
  const tasks = payload?.tasks ?? [];
  const content = payload?.content ?? '';

  const toggleTask = (taskId: string) => {
    setCompleted((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const allDone = tasks.length === 0 || tasks.every((t) => completed[t.id]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{step.title}</h2>
        <p className="text-sm text-rose-400/70 uppercase tracking-widest font-bold">Essay + Tasks</p>
      </div>

      {/* Essay Content */}
      <div className="prose prose-invert max-w-none">
        <div className="text-[#94a3b8] leading-[1.8] text-lg whitespace-pre-wrap">
          {content || 'Content is being prepared by the experience builder.'}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[#1e1e2e]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#4a4a6a]">Action Items</span>
        <div className="flex-1 h-px bg-[#1e1e2e]" />
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.length === 0 && (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b]">Action items are being prepared.</p>
          </div>
        )}
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all ${
              completed[task.id]
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : 'bg-[#12121a] border-[#1e1e2e] hover:border-[#33334d]'
            }`}
          >
            <span className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center text-xs border flex-shrink-0 ${
              completed[task.id]
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-[#1a1a2e] border-[#33334d] text-transparent'
            }`}>
              ✓
            </span>
            <span className={`font-medium ${completed[task.id] ? 'text-[#64748b] line-through' : 'text-[#e2e8f0]'}`}>
              {task.description}
            </span>
          </button>
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
          onClick={() => onComplete({ completedTasks: completed })}
          disabled={!allDone}
          className="px-8 py-3 bg-rose-500/20 text-rose-300 rounded-xl text-sm font-bold hover:bg-rose-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-rose-500/20"
        >
          All Done →
        </button>
      </div>
    </div>
  );
}

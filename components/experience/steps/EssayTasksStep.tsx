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
  onDraft?: (draft: Record<string, any>) => void;
}

export default function EssayTasksStep({ step, onComplete, onSkip, onDraft }: EssayTasksStepProps) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [taskResponses, setTaskResponses] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const payload = step.payload as EssayTasksPayload | null;
  const tasks = payload?.tasks ?? [];
  const content = payload?.content ?? '';

  const toggleTask = (taskId: string) => {
    const newState = { ...completed, [taskId]: !completed[taskId] };
    setCompleted(newState);
    if (onDraft) {
      onDraft({ completed: newState });
    }
  };

  const handleBlur = (taskId: string) => {
    if (onDraft && taskResponses[taskId]) {
      onDraft({ taskId, response: taskResponses[taskId] });
    }
  };

  const allDone = tasks.length === 0 || tasks.every((t) => !!completed[t.id] || !!taskResponses[t.id]?.trim());

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  const handleFinish = () => {
    onComplete({ completedTasks: completed });
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-3xl mx-auto">
      <div className="flex justify-between items-end border-b border-rose-500/20 pb-6">
        <div>
          <h2 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight mb-2">{step.title}</h2>
          <p className="text-sm text-rose-400 uppercase tracking-[0.2em] font-bold">Deep Work Component</p>
        </div>
        {isSubmitted && (
          <div className="bg-rose-500/10 border border-rose-400/30 px-4 py-1.5 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span className="text-[10px] font-bold text-rose-400 tracking-widest uppercase">Under Review</span>
          </div>
        )}
      </div>

      <div className="rounded-3xl border bg-[#12121a] border-rose-500/20 p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-[#f1f5f9]">Essay & Instructions</h3>
        </div>
        
        <div className="animate-in fade-in duration-500">
          <div className="prose prose-invert max-w-none">
            <div className="text-[#94a3b8] leading-[1.8] text-lg whitespace-pre-wrap font-serif italic border-l-2 border-[#1e1e2e] pl-6 py-2">
              {content || 'Detailed instructions are being prepared.'}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold text-[#475569] uppercase tracking-widest pl-4">Review Checklist</h4>
        <div className="grid gap-4">
          {tasks.length === 0 && (
            <div className="p-8 border border-dashed border-[#1e1e2e] rounded-2xl text-center">
              <p className="text-[#475569]">No specific tasks defined.</p>
            </div>
          )}
          {tasks.map((task) => {
            const isTaskDone = !!completed[task.id];
            const wordCount = taskResponses[task.id]?.trim().split(/\s+/).filter(Boolean).length || 0;
            return (
              <div
                key={task.id}
                className={`w-full p-6 rounded-2xl border transition-all duration-300 ${
                  isTaskDone
                    ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.03)]'
                    : 'bg-[#0d0d12] border-[#1e1e2e]'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className={`text-lg font-bold transition-all ${
                    isTaskDone ? 'text-emerald-400/60 line-through' : 'text-[#f1f5f9]'
                  }`}>
                    {task.description}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-[#475569]">{wordCount} WORDS</span>
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                        isTaskDone
                          ? 'bg-emerald-500 border-emerald-500 text-[#0a0a0f]'
                          : 'bg-transparent border-[#33334d] hover:border-emerald-500/50'
                      }`}
                    >
                      {isTaskDone && <span className="text-[14px]">✓</span>}
                    </button>
                  </div>
                </div>
                <textarea
                  value={taskResponses[task.id] || ''}
                  onChange={(e) => setTaskResponses({ ...taskResponses, [task.id]: e.target.value })}
                  onBlur={() => handleBlur(task.id)}
                  placeholder="Draft your response here…"
                  rows={8}
                  className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-5 py-4 text-[#e2e8f0] placeholder-[#94a3b8]/10 focus:outline-none focus:border-rose-500/30 transition-all resize-none font-serif leading-relaxed"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-10 border-t border-[#1e1e2e]">
        {!isSubmitted ? (
          <div className="flex items-center justify-between">
            <button
              onClick={onSkip}
              className="text-sm font-medium text-[#475569] hover:text-[#94a3b8] transition-colors"
            >
              Skip for now
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allDone}
              className="px-12 py-4 bg-rose-600 text-white rounded-xl text-sm font-extrabold hover:bg-rose-500 transition-all disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed shadow-xl shadow-rose-900/20 active:scale-95"
            >
              Submit for Review →
            </button>
          </div>
        ) : (
          <div className="bg-[#12121a] border border-emerald-500/20 p-10 rounded-3xl flex flex-col items-center gap-6 text-center animate-in zoom-in-95 duration-500 shadow-2xl">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 text-4xl mb-2 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              ✓
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[#f1f5f9]">Deep Work Logged</h3>
              <p className="text-[#94a3b8] mt-2 max-w-sm mx-auto leading-relaxed">
                Your submission is being processed. You can continue your journey while our engine reviews the results.
              </p>
            </div>
            <button
              onClick={handleFinish}
              className="w-full py-4 bg-[#f1f5f9] text-[#0a0a0f] rounded-xl text-sm font-extrabold hover:bg-white transition-all shadow-lg active:scale-95 mt-4"
            >
              Return to Pipeline →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

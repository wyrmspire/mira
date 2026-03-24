'use client'

import type { Idea } from '@/types/idea'

interface IdeaContextCardProps {
  idea: Idea
}

export function IdeaContextCard({ idea }: IdeaContextCardProps) {
  return (
    <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest rounded border border-indigo-500/20">
          Source: GPT
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/20 to-transparent" />
      </div>

      <div className="bg-[#12121a]/40 border border-[#1e1e2e] rounded-2xl p-6 backdrop-blur-sm">
        <h3 className="text-xl font-bold text-[#f8fafc] mb-3">{idea.title}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-[10px] font-bold text-[#4b5563] uppercase tracking-wider mb-2">Original Brainstorm</h4>
            <p className="text-[#94a3b8] text-sm italic line-clamp-3">"{idea.raw_prompt}"</p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-[#4b5563] uppercase tracking-wider mb-2">GPT Summary</h4>
            <p className="text-[#94a3b8] text-sm leading-relaxed">{idea.gpt_summary}</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[#1e1e2e] flex flex-wrap gap-2">
          {idea.vibe && (
            <span className="px-3 py-1 bg-amber-500/5 text-amber-400/80 text-xs rounded-full border border-amber-500/10">
              Vibe: {idea.vibe}
            </span>
          )}
          {idea.audience && (
            <span className="px-3 py-1 bg-emerald-500/5 text-emerald-400/80 text-xs rounded-full border border-emerald-500/10">
              For: {idea.audience}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

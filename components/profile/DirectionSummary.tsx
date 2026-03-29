// components/profile/DirectionSummary.tsx
'use client'

import { UserProfile } from '@/types/profile'
import { Goal } from '@/types/goal'
import { SkillDomain } from '@/types/skill'
import { formatDate } from '@/lib/date'
import { StatusBadge } from '@/components/common/status-badge'

interface DirectionSummaryProps {
  profile: UserProfile
  activeGoal: Goal | null
  skillDomains: SkillDomain[]
}

export function DirectionSummary({ profile, activeGoal, skillDomains }: DirectionSummaryProps) {
  const hasFacets = profile.facets.length > 0

  const strongestDomain = skillDomains.reduce((prev, current) => 
    (current.evidenceCount > (prev?.evidenceCount || 0)) ? current : prev, 
    null as SkillDomain | null
  )

  const emergingPattern = profile.facets.find(f => f.facet_type === 'preferred_mode' && f.confidence > 0.6)?.value

  if (!hasFacets) {
    return (
      <div className="p-8 rounded-xl border border-dashed border-slate-700/50 bg-slate-900/10 text-center flex flex-col items-center gap-4">
        <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-400">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-medium text-slate-200">Building Your Direction</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2">
            Your profile builds automatically as you complete experiences. Complete your first journey to see compiled intelligence here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Overview Card */}
      <div className="col-span-1 p-6 rounded-2xl border border-slate-700/50 bg-slate-900/40 shadow-xl flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400">
              {profile.displayName}
            </h2>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mt-1">
              Building since {formatDate(profile.memberSince)}
            </p>
          </div>
          <StatusBadge status="active" />
        </div>

        <div className="space-y-4 mt-2">
          {activeGoal ? (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 group transition-all hover:bg-amber-500/10">
               <span className="text-[10px] text-amber-500 uppercase font-black tracking-[0.2em] mb-1 block">Active Trajectory</span>
               <span className="text-sm font-bold text-slate-200 block truncate">{activeGoal.title}</span>
               <div className="flex items-center gap-2 mt-2">
                 <div className="flex-1 h-1 bg-amber-500/10 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                     style={{ width: `${Math.min(100, (profile.experienceCount.completed / 10) * 100)}%` }} 
                   />
                 </div>
                 <span className="text-[10px] font-mono text-amber-500/60 uppercase">{activeGoal.status}</span>
               </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-800/10 border border-slate-700/50 border-dashed text-center italic">
              <span className="text-xs text-slate-500">Pick a goal to track trajectory</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
             <StatMini label="Strongest" value={strongestDomain?.name || '---'} color="text-indigo-400" />
             <StatMini label="Flow Mode" value={emergingPattern || '---'} color="text-rose-400" />
          </div>
        </div>
      </div>

      {/* Intelligence Insights Card */}
      <div className="col-span-1 md:col-span-2 p-6 rounded-2xl border border-slate-700/50 bg-slate-900/40 shadow-xl flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-indigo-500 rounded-full" />
              <h3 className="text-xs uppercase tracking-[0.2em] font-black text-slate-400">Core Interests</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.topInterests.length > 0 ? (
                profile.topInterests.map(interest => (
                  <span key={interest} className="px-2.5 py-1 bg-white/5 text-slate-200 border border-white/5 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors cursor-default">
                    {interest}
                  </span>
                ))
              ) : (
                <span className="text-slate-600 italic text-xs">Awaiting signal...</span>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-emerald-500 rounded-full" />
              <h3 className="text-xs uppercase tracking-[0.2em] font-black text-slate-400">Primary Skills</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.topSkills.length > 0 ? (
                profile.topSkills.map(skill => (
                  <span key={skill} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/10 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-colors cursor-default">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-slate-600 italic text-xs">Awaiting evidence...</span>
              )}
            </div>
          </section>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
          <div className="flex gap-4">
             <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Time Lived</span>
                <span className="text-lg font-black text-white">~{((profile.experienceCount.completed * 45) / 60).toFixed(1)}<span className="text-xs font-normal text-slate-400 ml-1">hours</span></span>
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Momentum</span>
                <span className="text-lg font-black text-white">{profile.experienceCount.completionRate.toFixed(0)}%</span>
             </div>
          </div>
          <div className="text-right">
             <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] block mb-1">Intelligence Layer</span>
             <span className="text-xs text-slate-500 italic">v1.2 Studio Core</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 bg-white/5 rounded-xl border border-white/5 group">
      <span className="block text-[9px] uppercase tracking-widest font-black text-slate-500 mb-1">{label}</span>
      <span className={`block text-xs font-bold truncate ${color}`}>{value}</span>
    </div>
  )
}

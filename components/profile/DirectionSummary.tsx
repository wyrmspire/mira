// components/profile/DirectionSummary.tsx
'use client'

import { UserProfile } from '@/types/profile'
import { formatDate } from '@/lib/date'
import { TimePill } from '@/components/common/time-pill'
import { StatusBadge } from '@/components/common/status-badge'

interface DirectionSummaryProps {
  profile: UserProfile
}

export function DirectionSummary({ profile }: DirectionSummaryProps) {
  const hasFacets = profile.facets.length > 0

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
      <div className="col-span-1 p-6 rounded-xl border border-slate-700/50 bg-slate-900/20 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white">{profile.displayName}</h2>
            <p className="text-sm text-slate-400">Member since {formatDate(profile.memberSince)}</p>
          </div>
          <StatusBadge status="active" />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="p-3 bg-white/5 rounded-lg border border-white/5">
            <span className="block text-xl font-bold text-indigo-400">{profile.experienceCount.total}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Total Journeys</span>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/5">
            <span className="block text-xl font-bold text-emerald-400">{profile.experienceCount.completed}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Completed</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {profile.preferredDepth && (
            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Depth: {profile.preferredDepth}
            </span>
          )}
          {profile.preferredMode && (
            <div className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {profile.preferredMode}
            </div>
          )}
        </div>
      </div>

      {/* Interests & Skills Card */}
      <div className="col-span-1 md:col-span-2 p-6 rounded-xl border border-slate-700/50 bg-slate-900/20 space-y-6">
        <div>
          <h3 className="text-xs uppercase tracking-widest font-semibold text-indigo-400 mb-3">Top Interests</h3>
          <div className="flex flex-wrap gap-2">
            {profile.topInterests.length > 0 ? (
              profile.topInterests.map(interest => (
                <span key={interest} className="px-3 py-1 bg-indigo-500/5 text-indigo-300 border border-indigo-500/20 rounded-full text-sm">
                  #{interest}
                </span>
              ))
            ) : (
              <span className="text-slate-600 italic text-sm">No interests captured yet.</span>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-widest font-semibold text-emerald-400 mb-3">Core Skills</h3>
          <div className="flex flex-wrap gap-2">
            {profile.topSkills.length > 0 ? (
              profile.topSkills.map(skill => (
                <span key={skill} className="px-3 py-1 bg-emerald-500/5 text-emerald-300 border border-emerald-500/20 rounded-lg text-sm font-medium">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-slate-600 italic text-sm">No skills identified yet.</span>
            )}
          </div>
        </div>

        {profile.activeGoals.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-widest font-semibold text-amber-400 mb-3">Active Goals</h3>
            <ul className="flex flex-col gap-2">
              {profile.activeGoals.map(goal => (
                <li key={goal} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500/40" />
                  {goal}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

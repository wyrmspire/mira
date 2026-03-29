// app/profile/ProfileClient.tsx
'use client'

import { useState } from 'react'
import { UserProfile, FacetType } from '@/types/profile'
import { FacetCard } from '@/components/profile/FacetCard'
import { COPY } from '@/lib/studio-copy'

interface ProfileClientProps {
  profile: UserProfile
}

type FilterType = 'all' | FacetType

export function ProfileClient({ profile }: ProfileClientProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  const filteredFacets = activeFilter === 'all' 
    ? profile.facets 
    : profile.facets.filter(f => f.facet_type === activeFilter)

  const FILTERS: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: COPY.profilePage.sections.interests, value: 'interest' },
    { label: COPY.profilePage.sections.skills, value: 'skill' },
    { label: COPY.profilePage.sections.goals, value: 'goal' },
    { label: 'Effort', value: 'effort_area' },
    { label: 'Preferences', value: 'preferred_mode' },
  ]

  if (profile.facets.length === 0) return null

  return (
    <div className="space-y-8">
      {/* Activity Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ActivityCard 
          label="Total Journeys" 
          value={profile.experienceCount.total} 
          subValue={`${profile.experienceCount.active} active`}
        />
        <ActivityCard 
          label="Completion Rate" 
          value={`${profile.experienceCount.completionRate.toFixed(0)}%`} 
          subValue={`${profile.experienceCount.completed} completed`}
          color="text-emerald-400"
        />
        <ActivityCard 
          label="Top Focus" 
          value={profile.experienceCount.mostActiveClass || 'None'} 
          subValue="Most active class"
          color="text-indigo-400"
          isUppercase
        />
        <ActivityCard 
          label="Avg Friction" 
          value={profile.experienceCount.averageFriction.toFixed(1)} 
          subValue="Scale 1-3"
          color={profile.experienceCount.averageFriction > 2 ? 'text-amber-400' : 'text-slate-400'}
        />
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map(filter => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeFilter === filter.value
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filteredFacets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredFacets.map(facet => (
              <FacetCard key={facet.id} facet={facet} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 italic">
            No facets found for this category.
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityCard({ 
  label, 
  value, 
  subValue, 
  color = 'text-white',
  isUppercase = false 
}: { 
  label: string; 
  value: string | number; 
  subValue: string; 
  color?: string;
  isUppercase?: boolean;
}) {
  return (
    <div className="p-4 rounded-xl border border-white/5 bg-slate-900/40 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
        {label}
      </span>
      <span className={`text-xl font-bold truncate ${color} ${isUppercase ? 'uppercase' : ''}`}>
        {value}
      </span>
      <span className="text-[10px] text-slate-400 font-medium">
        {subValue}
      </span>
    </div>
  )
}

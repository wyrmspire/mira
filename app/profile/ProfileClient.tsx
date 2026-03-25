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
  )
}

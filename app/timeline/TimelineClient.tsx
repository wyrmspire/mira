'use client'

import { useState } from 'react'
import { TimelineEntry, TimelineStats, TimelineCategory } from '@/types/timeline'
import { TimelineEventCard } from '@/components/timeline/TimelineEventCard'
import { TimelineFilterBar } from '@/components/timeline/TimelineFilterBar'
import { COPY } from '@/lib/studio-copy'
import { EmptyState } from '@/components/common/empty-state'

interface TimelineClientProps {
  initialEntries: TimelineEntry[]
  stats: TimelineStats
}

export function TimelineClient({ initialEntries, stats }: TimelineClientProps) {
  const [filter, setFilter] = useState<'all' | TimelineCategory>('all')

  const filteredEntries = initialEntries.filter(entry => 
    filter === 'all' || entry.category === filter
  )

  const getEmptyMessage = () => {
    switch (filter) {
      case 'experience': return COPY.experience.timelinePage.emptyExperiences
      case 'idea': return COPY.experience.timelinePage.emptyIdeas
      case 'system': return COPY.experience.timelinePage.emptySystem
      default: return COPY.experience.timelinePage.emptyAll
    }
  }

  return (
    <div>
      <TimelineFilterBar 
        filter={filter} 
        onChange={setFilter} 
        counts={{
          all: stats.totalEvents,
          experience: stats.experienceEvents,
          idea: stats.ideaEvents,
          system: stats.totalEvents - stats.experienceEvents - stats.ideaEvents - (stats.totalEvents > 0 ? 0 : 0), // Simple math for system/github
          github: 0 // Placeholder until stats service is more granular
        }}
      />

      <div className="space-y-4">
        {filteredEntries.length > 0 ? (
          filteredEntries.map(entry => (
            <TimelineEventCard key={entry.id} entry={entry} />
          ))
        ) : (
          <div className="py-20 text-center">
             <p className="text-[#94a3b8]">{getEmptyMessage()}</p>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { TimelineEntry, TimelineStats, TimelineCategory } from '@/types/timeline'
import { TimelineEventCard } from '@/components/timeline/TimelineEventCard'
import { TimelineFilterBar } from '@/components/timeline/TimelineFilterBar'
import { COPY } from '@/lib/studio-copy'

interface TimelineClientProps {
  initialEntries: TimelineEntry[]
  stats: TimelineStats
}

type GroupedEntries = {
  label: string;
  entries: TimelineEntry[];
}[]

export function TimelineClient({ initialEntries, stats }: TimelineClientProps) {
  const [filter, setFilter] = useState<'all' | TimelineCategory>('all')

  const filteredEntries = useMemo(() => {
    return initialEntries.filter(entry => 
      filter === 'all' || entry.category === filter
    )
  }, [initialEntries, filter])

  const groupedEntries = useMemo(() => {
    const groups: Record<string, TimelineEntry[]> = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Earlier': []
    }

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    const today = now.getTime()
    const yesterday = today - (24 * 60 * 60 * 1000)
    const thisWeek = today - (7 * 24 * 60 * 60 * 1000)

    filteredEntries.forEach(entry => {
      const entryDate = new Date(entry.timestamp)
      entryDate.setHours(0, 0, 0, 0)
      const entryTime = entryDate.getTime()

      if (entryTime === today) {
        groups['Today'].push(entry)
      } else if (entryTime === yesterday) {
        groups['Yesterday'].push(entry)
      } else if (entryTime > thisWeek) {
        groups['This Week'].push(entry)
      } else {
        groups['Earlier'].push(entry)
      }
    })

    return Object.entries(groups)
      .filter(([_, entries]) => entries.length > 0)
      .map(([label, entries]) => ({ label, entries }))
  }, [filteredEntries])

  const getEmptyMessage = () => {
    switch (filter) {
      case 'experience': return COPY.experience.timelinePage.emptyExperiences
      case 'idea': return COPY.experience.timelinePage.emptyIdeas
      case 'system': return COPY.experience.timelinePage.emptySystem
      default: return COPY.experience.timelinePage.emptyAll
    }
  }

  return (
    <div className="space-y-8">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Events', value: stats.totalEvents },
          { label: 'This Week', value: stats.thisWeek },
          { label: 'Experiences', value: stats.experienceEvents },
          { label: 'Ideas', value: stats.ideaEvents },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#475569] mb-1">
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-[#e2e8f0]">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <TimelineFilterBar 
        filter={filter} 
        onChange={setFilter} 
        counts={{
          all: stats.totalEvents,
          experience: stats.experienceEvents,
          idea: stats.ideaEvents,
          system: stats.systemEvents,
          github: stats.githubEvents
        }}
      />

      <div className="space-y-12">
        {groupedEntries.length > 0 ? (
          groupedEntries.map(group => (
            <section key={group.label} className="relative">
              <div className="sticky top-0 z-20 py-4 bg-[#09090b]/80 backdrop-blur-md mb-6">
                <h2 className="text-xs uppercase font-bold tracking-[0.2em] text-slate-500 flex items-center gap-4">
                  <span>{group.label}</span>
                  <div className="h-px flex-1 bg-slate-800/50" />
                </h2>
              </div>
              
              <div className="space-y-0">
                {group.entries.map(entry => (
                  <TimelineEventCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="py-20 text-center border border-dashed border-[#1e1e2e] rounded-2xl bg-[#12121a]/30">
             <p className="text-[#94a3b8]">{getEmptyMessage()}</p>
          </div>
        )}
      </div>
    </div>
  )
}


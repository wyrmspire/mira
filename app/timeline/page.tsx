import { AppShell } from '@/components/shell/app-shell'
import { COPY } from '@/lib/studio-copy'
import { getTimelineEntries, getTimelineStats } from '@/lib/services/timeline-service'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { TimelineClient } from './TimelineClient'

export const dynamic = 'force-dynamic'

export default async function TimelinePage() {
  const [entries, stats] = await Promise.all([
    getTimelineEntries(DEFAULT_USER_ID),
    getTimelineStats(DEFAULT_USER_ID)
  ])

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">
            {COPY.experience.timelinePage.heading}
          </h1>
          <p className="text-[#94a3b8]">
            {COPY.experience.timelinePage.subheading}
          </p>
        </header>

        <TimelineClient 
          initialEntries={entries} 
          stats={stats}
        />
      </div>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'

import { getProjectsByState } from '@/lib/services/projects-service'
import { AppShell } from '@/components/shell/app-shell'
import { EmptyState } from '@/components/common/empty-state'
import { GraveyardCard } from '@/components/archive/graveyard-card'

import { COPY } from '@/lib/studio-copy'

export default async function KilledPage() {
  const projects = await getProjectsByState('killed')

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e2e8f0]">{COPY.killed.heading}</h1>
          <p className="text-sm text-[#94a3b8] mt-1">Projects removed from focus</p>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            title={COPY.killed.empty}
            description="Ideas that were put to rest live here."
            icon="†"
          />
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <GraveyardCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

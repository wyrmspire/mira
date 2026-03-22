import { getProjectsByState } from '@/lib/services/projects-service'
import { AppShell } from '@/components/shell/app-shell'
import { EmptyState } from '@/components/common/empty-state'
import { GraveyardCard } from '@/components/archive/graveyard-card'

export default function KilledPage() {
  const projects = getProjectsByState('killed')

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Graveyard</h1>
          <p className="text-sm text-[#94a3b8] mt-1">Removed projects</p>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            title="Nothing removed"
            description="Good ideas die too — that's how focus works."
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

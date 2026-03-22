import { getProjectsByState } from '@/lib/services/projects-service'
import { AppShell } from '@/components/shell/app-shell'
import { EmptyState } from '@/components/common/empty-state'
import { TrophyCard } from '@/components/archive/trophy-card'

export default function ShippedPage() {
  const projects = getProjectsByState('shipped')

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Trophy Room</h1>
          <p className="text-sm text-[#94a3b8] mt-1">
            {projects.length} shipped project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            title="Nothing shipped yet"
            description="Get one idea to the finish line."
            icon="✦"
          />
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <TrophyCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

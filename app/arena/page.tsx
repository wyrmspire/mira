import { getArenaProjects } from '@/lib/services/projects-service'
import { AppShell } from '@/components/shell/app-shell'
import { EmptyState } from '@/components/common/empty-state'
import { ArenaProjectCard } from '@/components/arena/arena-project-card'
import { ActiveLimitBanner } from '@/components/arena/active-limit-banner'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export default async function ArenaPage() {
  const projects = await getArenaProjects()

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#e2e8f0]">In Progress</h1>
            <p className="text-sm text-[#94a3b8] mt-1">Active projects</p>
          </div>
          <Link
            href={ROUTES.send}
            className="px-3 py-1.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
          >
            + New
          </Link>
        </div>

        <ActiveLimitBanner count={projects.length} />

        {projects.length === 0 ? (
          <EmptyState
            title="No active projects"
            description="Define an idea to get started."
            icon="▶"
            action={
              <Link href={ROUTES.send} className="text-sm text-indigo-400 hover:text-indigo-300">
                Define an idea →
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <ArenaProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

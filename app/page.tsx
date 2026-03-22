import { getIdeasByStatus } from '@/lib/services/ideas-service'
import { getArenaProjects } from '@/lib/services/projects-service'
import { AppShell } from '@/components/shell/app-shell'
import { EmptyState } from '@/components/common/empty-state'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export default function HomePage() {
  const captured = getIdeasByStatus('captured')
  const arenaProjects = getArenaProjects()

  return (
    <AppShell>
      {arenaProjects.length > 0 ? (
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">Studio</h1>
            <p className="text-[#94a3b8]">
              {arenaProjects.length} project{arenaProjects.length !== 1 ? 's' : ''} in progress
              {captured.length > 0 && ` · ${captured.length} idea${captured.length !== 1 ? 's' : ''} waiting`}
            </p>
          </div>
          <div className="space-y-3">
            {captured.length > 0 && (
              <Link
                href={ROUTES.send}
                className="flex items-center justify-between p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/15 transition-colors group"
              >
                <div>
                  <div className="text-sm font-medium text-indigo-300 mb-1">New idea waiting</div>
                  <div className="text-xs text-indigo-400/70">
                    {captured.length} idea{captured.length !== 1 ? 's' : ''} to define
                  </div>
                </div>
                <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            )}
            <Link
              href={ROUTES.arena}
              className="flex items-center justify-between p-4 bg-[#12121a] border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-colors group"
            >
              <div>
                <div className="text-sm font-medium text-[#e2e8f0] mb-1">View In Progress</div>
                <div className="text-xs text-[#94a3b8]">
                  {arenaProjects.length} active project{arenaProjects.length !== 1 ? 's' : ''}
                </div>
              </div>
              <span className="text-[#6366f1] group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Mira Studio"
          description="Chat is where ideas are born. Studio is where ideas are forced into truth. Send an idea from the GPT to get started."
          icon="◈"
          action={
            <Link
              href={ROUTES.send}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-500/30 transition-colors"
            >
              + Define an Idea
            </Link>
          }
        />
      )}
    </AppShell>
  )
}

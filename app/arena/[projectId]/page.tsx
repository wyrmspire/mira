import { notFound } from 'next/navigation'
import { getProjectById } from '@/lib/services/projects-service'
import { getTasksForProject } from '@/lib/services/tasks-service'
import { getPRsForProject } from '@/lib/services/prs-service'
import { buildArenaViewModel } from '@/lib/view-models/arena-view-model'
import { AppShell } from '@/components/shell/app-shell'
import { ProjectAnchorPane } from '@/components/arena/project-anchor-pane'
import { ProjectEnginePane } from '@/components/arena/project-engine-pane'
import { ProjectRealityPane } from '@/components/arena/project-reality-pane'
import { ProjectHealthStrip } from '@/components/arena/project-health-strip'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

interface Props {
  params: { projectId: string }
}

export default async function ArenaProjectPage({ params }: Props) {
  const project = getProjectById(params.projectId)
  if (!project) notFound()

  const tasks = await getTasksForProject(project.id)
  const prs = await getPRsForProject(project.id)
  const vm = buildArenaViewModel(project, tasks, prs)

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href={ROUTES.arena} className="text-[#94a3b8] hover:text-[#e2e8f0] text-sm transition-colors">
            ← In Progress
          </Link>
          <span className="text-[#1e1e2e]">/</span>
          <h1 className="text-sm font-medium text-[#e2e8f0]">{project.name}</h1>
        </div>

        <div className="mb-4">
          <ProjectHealthStrip project={project} donePct={vm.donePct} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ProjectAnchorPane project={project} />
          <ProjectEnginePane tasks={tasks} />
          <ProjectRealityPane prs={prs} project={project} />
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-[#94a3b8]">
          <span>{vm.openPRCount} open PR{vm.openPRCount !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{vm.blockedTaskCount} blocked task{vm.blockedTaskCount !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{vm.donePct}% done</span>
        </div>
      </div>
    </AppShell>
  )
}

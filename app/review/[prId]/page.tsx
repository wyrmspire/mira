import { notFound } from 'next/navigation'
import { getPRById } from '@/lib/services/prs-service'
import { getProjectById } from '@/lib/services/projects-service'
import { buildReviewViewModel } from '@/lib/view-models/review-view-model'
import { AppShell } from '@/components/shell/app-shell'
import { SplitReviewLayout } from '@/components/review/split-review-layout'
import { PRSummaryCard } from '@/components/review/pr-summary-card'
import { DiffSummary } from '@/components/review/diff-summary'
import { BuildStatusChip } from '@/components/review/build-status-chip'
import { FixRequestBox } from '@/components/review/fix-request-box'
import { PreviewToolbar } from '@/components/review/preview-toolbar'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

interface Props {
  params: { prId: string }
}

export default async function ReviewPage({ params }: Props) {
  const pr = await getPRById(params.prId)
  if (!pr) notFound()

  const project = getProjectById(pr.projectId)
  const vm = buildReviewViewModel(pr, project)

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {project && (
            <>
              <Link
                href={ROUTES.arenaProject(project.id)}
                className="text-[#94a3b8] hover:text-[#e2e8f0] text-sm transition-colors"
              >
                ← {project.name}
              </Link>
              <span className="text-[#1e1e2e]">/</span>
            </>
          )}
          <h1 className="text-sm font-medium text-[#e2e8f0]">Review PR #{pr.number}</h1>
        </div>

        <SplitReviewLayout
          left={
            <>
              <PRSummaryCard pr={pr} />
              <DiffSummary />
              {pr.previewUrl && <PreviewToolbar url={pr.previewUrl} />}
            </>
          }
          right={
            <>
              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
                <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">
                  Build Status
                </h3>
                <BuildStatusChip state={pr.buildState} />
                <div className="mt-4">
                  <button
                    disabled={!vm.canMerge}
                    className="w-full px-4 py-2.5 text-sm font-medium bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Merge PR
                  </button>
                </div>
              </div>
              <FixRequestBox />
            </>
          }
        />
      </div>
    </AppShell>
  )
}

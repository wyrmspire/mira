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
import { MergeActions } from '@/components/review/merge-actions'
import { PreviewFrame } from '@/components/arena/preview-frame'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

interface Props {
  params: { prId: string }
}

export default async function ReviewPage({ params }: Props) {
  const prResult = await getPRById(params.prId)
  if (!prResult) notFound()
  // After notFound(), TypeScript doesn't know execution stops, so we re-assign
  const pr = prResult as NonNullable<typeof prResult>

  const project = await getProjectById(pr.projectId)
  const vm = buildReviewViewModel(pr, project)

  const breadcrumb = (
    <div className="flex items-center gap-2 text-sm">
      {project && (
        <>
          <Link
            href={ROUTES.arenaProject(project.id)}
            className="text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
          >
            ← {project.name}
          </Link>
          <span className="text-[#1e1e2e]">/</span>
        </>
      )}
      <h1 className="font-medium text-[#e2e8f0]">Review PR #{pr.number}</h1>
    </div>
  )

  const preview = <PreviewFrame previewUrl={pr.previewUrl} />

  const sidebar = (
    <>
      <PRSummaryCard pr={pr} />

      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
        <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">
          Build Status
        </h3>
        <BuildStatusChip state={pr.buildState} />
      </div>

      <DiffSummary />

      <MergeActions
        prId={pr.id}
        canMerge={vm.canMerge}
        currentStatus={pr.status}
        reviewState={vm.reviewState}
      />

      <FixRequestBox prId={pr.id} existingRequest={pr.requestedChanges} />
    </>
  )

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <SplitReviewLayout
          breadcrumb={breadcrumb}
          preview={preview}
          sidebar={sidebar}
        />
      </div>
    </AppShell>
  )
}

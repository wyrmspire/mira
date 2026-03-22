import { AppShell } from '@/components/shell/app-shell'
import { getIdeasByStatus } from '@/lib/services/ideas-service'
import { EmptyState } from '@/components/common/empty-state'
import { CapturedIdeaCard } from '@/components/send/captured-idea-card'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export default function SendPage() {
  const ideas = getIdeasByStatus('captured')
  const idea = ideas[0]

  if (!idea) {
    return (
      <AppShell>
        <EmptyState
          title="No ideas waiting"
          description="Send an idea from the GPT to get started."
          icon="◎"
          action={
            <Link href={ROUTES.arena} className="text-sm text-indigo-400 hover:text-indigo-300">
              View In Progress →
            </Link>
          }
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e2e8f0] mb-1">Idea captured.</h1>
          <p className="text-[#94a3b8] text-sm">Define it or let it go.</p>
        </div>
        <CapturedIdeaCard idea={idea} />
      </div>
    </AppShell>
  )
}

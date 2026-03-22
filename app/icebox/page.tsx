import { getIdeas } from '@/lib/services/ideas-service'
import { getProjects } from '@/lib/services/projects-service'
import { buildIceboxViewModel } from '@/lib/view-models/icebox-view-model'
import { AppShell } from '@/components/shell/app-shell'
import { EmptyState } from '@/components/common/empty-state'
import { IceboxCard } from '@/components/icebox/icebox-card'

import { COPY } from '@/lib/studio-copy'

export default async function IceboxPage() {
  const ideas = await getIdeas()
  const projects = await getProjects()
  const items = buildIceboxViewModel(ideas, projects)

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e2e8f0]">{COPY.icebox.heading}</h1>
          <p className="text-sm text-[#94a3b8] mt-1">{COPY.icebox.subheading}</p>
        </div>

        {items.length === 0 ? (
          <EmptyState
            title={COPY.icebox.empty}
            description="Ideas are either in play or gone. Nothing deferred right now."
            icon="❄"
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <IceboxCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

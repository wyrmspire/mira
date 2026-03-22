export const dynamic = 'force-dynamic'

import { getInboxEvents } from '@/lib/services/inbox-service'
import { buildInboxViewModel } from '@/lib/view-models/inbox-view-model'
import { AppShell } from '@/components/shell/app-shell'
import { InboxFeed } from '@/components/inbox/inbox-feed'

export default async function InboxPage() {
  const events = await getInboxEvents()
  const vm = buildInboxViewModel(events)

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Inbox</h1>
          <p className="text-sm text-[#94a3b8] mt-1">
            {vm.unreadCount} unread
            {vm.errorCount > 0 && ` · ${vm.errorCount} error${vm.errorCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        <InboxFeed events={events} />
      </div>
    </AppShell>
  )
}

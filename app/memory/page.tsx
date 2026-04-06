import { Suspense } from 'react'
import { getMemoriesGroupedByTopic } from '@/lib/services/agent-memory-service'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { MemoryExplorer } from '@/components/memory/MemoryExplorer'
import { AppShell } from '@/components/shell/app-shell'
import { COPY } from '@/lib/studio-copy'

export const dynamic = 'force-dynamic'

export default async function MemoryPage() {
  const userId = DEFAULT_USER_ID
  const groupedMemories = await getMemoriesGroupedByTopic(userId)

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-32">
        <header className="mb-20 pt-10">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-[#6366f1] text-2xl">🧠</span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#6366f1]/80">Agent Intelligence Layer</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#f1f5f9] tracking-tight mb-4">
            {COPY.memory.heading}
          </h1>
          <p className="text-[#94a3b8] text-lg max-w-2xl leading-relaxed">
            {COPY.memory.subheading}
          </p>
        </header>

        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 text-[#64748b] animate-pulse">
            <div className="text-4xl mb-4">...</div>
            <p className="text-sm uppercase tracking-widest font-bold">Synchronizing Memory Nodes</p>
          </div>
        }>
          <MemoryExplorer initialGroupedMemories={groupedMemories} userId={userId} />
        </Suspense>
      </div>
    </AppShell>
  )
}

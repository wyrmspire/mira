'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Idea } from '@/types/idea'
import { CapturedIdeaCard } from '@/components/send/captured-idea-card'
import { ConfirmDialog } from '@/components/common/confirm-dialog'

interface SendPageClientProps {
  ideas: Idea[]
}

export function SendPageClient({ ideas }: SendPageClientProps) {
  const router = useRouter()
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleHold(ideaId: string) {
    if (busy) return
    setBusy(true)
    try {
      await fetch('/api/actions/move-to-icebox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveConfirmed() {
    if (!pendingRemoveId || busy) return
    setBusy(true)
    try {
      await fetch('/api/actions/kill-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: pendingRemoveId }),
      })
      setPendingRemoveId(null)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        {ideas.map((idea) => (
          <CapturedIdeaCard
            key={idea.id}
            idea={idea}
            onHold={handleHold}
            onRemove={(id) => setPendingRemoveId(id)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={pendingRemoveId !== null}
        title="Remove this idea?"
        description="This will move the idea to the Removed list. This can't be undone."
        confirmLabel="Remove"
        cancelLabel="Keep it"
        variant="danger"
        onConfirm={handleRemoveConfirmed}
        onCancel={() => setPendingRemoveId(null)}
      />
    </>
  )
}

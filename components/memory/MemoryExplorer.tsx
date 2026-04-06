'use client'

import { useState } from 'react'
import { AgentMemoryEntry } from '@/types/agent-memory'
import { MemoryEntryCard } from './MemoryEntryCard'
import { COPY } from '@/lib/studio-copy'

interface MemoryExplorerProps {
  initialGroupedMemories: Record<string, AgentMemoryEntry[]>
  userId: string
}

export function MemoryExplorer({ initialGroupedMemories, userId }: MemoryExplorerProps) {
  const [groupedMemories, setGroupedMemories] = useState(initialGroupedMemories)
  const [expandedTopics, setExpandedTopics] = useState<string[]>(Object.keys(initialGroupedMemories))

  const toggleTopic = (topic: string) => {
    setExpandedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    )
  }

  const handleUpdate = async (id: string, updates: Partial<AgentMemoryEntry>) => {
    // Optimistic update
    const newGrouped = { ...groupedMemories }
    let updatedEntry: AgentMemoryEntry | null = null
    
    for (const topic in newGrouped) {
      const idx = newGrouped[topic].findIndex((e) => e.id === id)
      if (idx !== -1) {
        newGrouped[topic][idx] = { ...newGrouped[topic][idx], ...updates }
        updatedEntry = newGrouped[topic][idx]
        break
      }
    }
    
    setGroupedMemories({ ...newGrouped })

    // Call API
    try {
      const res = await fetch(`/api/gpt/memory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Update failed')
    } catch (err) {
      console.error('[MemoryExplorer] Update failed:', err)
      // Note: In production you'd want to rollback state here
    }
  }

  const handleDelete = async (id: string) => {
    const newGrouped = { ...groupedMemories }
    for (const topic in newGrouped) {
      const idx = newGrouped[topic].findIndex((e) => e.id === id)
      if (idx !== -1) {
        newGrouped[topic].splice(idx, 1)
        if (newGrouped[topic].length === 0) delete newGrouped[topic]
        break
      }
    }
    setGroupedMemories({ ...newGrouped })

    try {
      const res = await fetch(`/api/gpt/memory/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    } catch (err) {
      console.error('[MemoryExplorer] Delete failed:', err)
    }
  }

  if (Object.keys(groupedMemories).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in duration-700">
        <div className="w-16 h-16 rounded-full bg-[#12121a] flex items-center justify-center border border-[#1e1e2e] mb-6 text-2xl shadow-xl">
          🧠
        </div>
        <h3 className="text-[#f1f5f9] font-medium mb-2">{COPY.memory.heading}</h3>
        <p className="text-[#94a3b8] text-sm max-w-sm leading-relaxed">
          {COPY.memory.emptyState}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {Object.entries(groupedMemories)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([topic, entries]) => (
          <section key={topic} className="space-y-6">
            <button
              onClick={() => toggleTopic(topic)}
              className="flex items-center gap-4 group w-full text-left"
            >
              <div className="flex items-center gap-3">
                <span className={`text-[10px] text-[#475569] transition-transform duration-300 ${expandedTopics.includes(topic) ? 'rotate-90' : ''}`}>
                  ▶
                </span>
                <h3 className="text-xs font-bold text-[#94a3b8] tracking-[0.2em] uppercase group-hover:text-[#e2e8f0] transition-colors">
                  {topic}
                </h3>
              </div>
              <div className="h-px flex-1 bg-[#1e1e2e]" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#64748b] bg-[#12121a] px-2 py-0.5 rounded border border-[#1e1e2e]">
                  {entries.length} units
                </span>
              </div>
            </button>

            {expandedTopics.includes(topic) && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-in fade-in slide-in-from-top-2 duration-500">
                {entries
                  .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
                  .map((entry) => (
                    <MemoryEntryCard
                      key={entry.id}
                      entry={entry}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
              </div>
            )}
          </section>
        ))}
    </div>
  )
}

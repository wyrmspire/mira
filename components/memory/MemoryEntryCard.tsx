'use client'

import { useState } from 'react'
import { AgentMemoryEntry, MemoryEntryKind } from '@/types/agent-memory'
import { COPY } from '@/lib/studio-copy'
import { formatDistanceToNow } from 'date-fns'

interface MemoryEntryCardProps {
  entry: AgentMemoryEntry
  onUpdate: (id: string, updates: Partial<AgentMemoryEntry>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const KIND_COLORS: Record<MemoryEntryKind, string> = {
  observation: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  strategy: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  idea: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  preference: 'bg-green-500/10 text-green-400 border-green-500/20',
  tactic: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  assessment: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  note: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

export function MemoryEntryCard({ entry, onUpdate, onDelete }: MemoryEntryCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(entry.content)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (editContent === entry.content) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onUpdate(entry.id, { content: editContent })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTogglePin = async () => {
    await onUpdate(entry.id, { pinned: !entry.pinned })
  }

  return (
    <div className={`group relative p-4 rounded-xl border bg-[#12121a] transition-all hover:border-[#1e1e2e] ${entry.pinned ? 'border-amber-500/30' : 'border-transparent'}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${KIND_COLORS[entry.kind]}`}>
            {COPY.memory.kinds[entry.kind]}
          </span>
          {entry.pinned && (
            <span className="text-amber-500 text-xs">★</span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={handleTogglePin}
            className={`p-1.5 rounded hover:bg-[#1e1e2e] transition-colors ${entry.pinned ? 'text-amber-500' : 'text-[#94a3b8]'}`}
            title={entry.pinned ? COPY.memory.actions.unpin : COPY.memory.actions.pin}
          >
            {entry.pinned ? '★' : '☆'}
          </button>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded hover:bg-[#1e1e2e] text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
              title={COPY.memory.actions.edit}
            >
              ✎
            </button>
          )}
          <button 
            onClick={() => setIsDeleting(true)}
            className="p-1.5 rounded hover:bg-red-500/10 text-[#94a3b8] hover:text-red-400 transition-colors"
            title={COPY.memory.actions.delete}
          >
            ×
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-3 text-sm text-[#e2e8f0] focus:ring-1 focus:ring-[#6366f1] focus:border-[#6366f1] outline-none min-h-[80px]"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setIsEditing(false); setEditContent(entry.content); }}
              className="px-3 py-1.5 rounded text-xs text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
              disabled={isSaving}
            >
              {COPY.common.cancel}
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded text-xs bg-[#6366f1] text-[#fff] hover:bg-[#4f46e5] disabled:opacity-50 transition-colors"
              disabled={isSaving}
            >
              {isSaving ? COPY.common.loading : COPY.common.save}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#e2e8f0] leading-relaxed mb-4 whitespace-pre-wrap">
          {entry.content}
        </p>
      )}

      <div className="flex items-center gap-4 text-[10px] text-[#64748b]">
        <div className="flex items-center gap-1">
          <span className="font-semibold">Used:</span>
          <span>{entry.usageCount}x</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold">Confidence:</span>
          <div className="w-12 h-1 bg-[#1e1e2e] rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all" 
              style={{ width: `${(entry.confidence || 0.6) * 100}%` }}
            />
          </div>
        </div>
        <div className="ml-auto">
          {entry.lastUsedAt && (
            <span>Last used {formatDistanceToNow(new Date(entry.lastUsedAt))} ago</span>
          )}
        </div>
      </div>

      {isDeleting && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 rounded-xl bg-[#0a0a0f]/95 border border-red-500/50 backdrop-blur-sm">
          <p className="text-sm font-medium text-[#e2e8f0] mb-4 text-center">
            {COPY.memory.confirmDelete}
          </p>
          <div className="flex gap-2 w-full max-w-[200px]">
            <button
              onClick={() => setIsDeleting(false)}
              className="flex-1 px-4 py-2 rounded-lg bg-[#1e1e2e] text-[#e2e8f0] text-xs hover:bg-[#2e2e3e] transition-colors"
            >
              {COPY.common.cancel}
            </button>
            <button
              onClick={() => onDelete(entry.id)}
              className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs border border-red-500/30 hover:bg-red-500/30 transition-colors"
            >
              {COPY.memory.actions.delete}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

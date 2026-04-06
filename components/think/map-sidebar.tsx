'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COPY } from '@/lib/studio-copy'
import { ThinkBoard, BoardPurpose } from '@/types/mind-map'

interface MapSidebarProps {
  boards: (ThinkBoard & { nodeCount: number; edgeCount: number })[]
  activeBoardId: string
}

const PURPOSE_CONFIG: Record<BoardPurpose, { label: string; color: string; preview: string }> = {
  general: { 
    label: 'General', 
    color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    preview: 'A blank canvas for your thoughts.'
  },
  idea_planning: { 
    label: 'Idea Planning', 
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    preview: 'Auto-creates nodes for Market, Tech, UX, and Risks.'
  },
  curriculum_review: { 
    label: 'Curriculum', 
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    preview: 'Auto-creates nodes for Foundations, Core, Advanced, and Cases.'
  },
  lesson_plan: { 
    label: 'Lesson Plan', 
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    preview: 'Auto-creates nodes for Primer, Practice, Checkpoint, and Reflection.'
  },
  research_tracking: { 
    label: 'Research', 
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    preview: 'Auto-creates nodes for Pending, In Progress, and Complete.'
  },
  strategy: { 
    label: 'Strategy', 
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    preview: 'Auto-creates domain-level strategic nodes.'
  },
}

export function MapSidebar({ boards, activeBoardId }: MapSidebarProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPurpose, setNewPurpose] = useState<BoardPurpose>('general')
  const [loading, setLoading] = useState(false)

  const filteredBoards = boards.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSwitch = (id: string) => {
    router.push(`/map?boardId=${id}`)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || loading) return
    setLoading(true)

    try {
      const resp = await fetch('/api/mindmap/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newName,
          purpose: newPurpose
        })
      })
      
      if (resp.ok) {
        const newBoard = await resp.json()
        setNewName('')
        setNewPurpose('general')
        setIsCreating(false)
        router.push(`/map?boardId=${newBoard.id}`)
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to create board:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this board? This cannot be undone.')) return

    try {
      const resp = await fetch(`/api/mindmap/boards/${id}`, { method: 'DELETE' })
      if (resp.ok) {
        if (id === activeBoardId) {
          const next = boards.filter(b => b.id !== id)[0]
          router.push(next ? `/map?boardId=${next.id}` : '/map')
        }
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to delete board:', err)
    }
  }

  return (
    <aside className="w-[360px] h-full flex flex-col bg-[#05050a] border-l border-[#1e1e2e] shadow-2xl relative z-20">
      <div className="p-6 border-b border-[#1e1e2e]">
        <h2 className="text-lg font-bold text-[#f1f5f9] mb-4 flex items-center gap-2">
          <span className="text-[#6366f1] text-xl font-mono leading-none">⊹</span>
          {COPY.mindMap.heading}
        </h2>
        
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569] text-xs">⚲</span>
          <input
            type="text"
            placeholder="Search boards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg pl-8 pr-3 py-2 text-xs text-[#e2e8f0] focus:ring-1 focus:ring-[#6366f1] focus:border-[#6366f1] outline-none transition-all placeholder:text-[#475569]"
          />
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/10"
          >
            <span>+</span>
            {COPY.mindMap.actions.createBoard}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {filteredBoards.map(board => {
          const active = board.id === activeBoardId
          const config = PURPOSE_CONFIG[board.purpose || 'general']
          
          return (
            <button
              key={board.id}
              onClick={() => handleSwitch(board.id)}
              className={`group relative w-full p-4 rounded-xl text-left border transition-all duration-300 ${
                active 
                  ? 'bg-[#1e1e2e]/50 border-indigo-500/30' 
                  : 'bg-[#12121a]/30 border-transparent hover:bg-[#12121a]/80 hover:border-[#1e1e2e]'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${config.color}`}>
                  {config.label}
                </span>
                <span 
                  onClick={(e) => handleDelete(e, board.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#475569] hover:text-red-400 transition-all text-sm p-1 leading-none"
                  title="Archive Board"
                >
                  ×
                </span>
              </div>
              
              <h4 className={`text-sm font-semibold truncate mb-3 ${active ? 'text-indigo-300' : 'text-[#e2e8f0]'}`}>
                {board.name}
              </h4>

              <div className="flex items-center gap-4 text-[10px] text-[#64748b] font-mono">
                <div className="flex items-center gap-1">
                  <span className="text-[#475569]">N:</span>
                  <span>{board.nodeCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[#475569]">E:</span>
                  <span>{board.edgeCount}</span>
                </div>
              </div>

              {active && (
                <div className="absolute right-4 bottom-4 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              )}
            </button>
          )
        })}

        {filteredBoards.length === 0 && search && (
          <div className="text-center py-10">
            <p className="text-xs text-[#64748b]">No boards matching "{search}"</p>
          </div>
        )}
      </div>

      {isCreating && (
        <div className="p-6 border-t border-[#1e1e2e] bg-[#0a0a14] animate-in slide-in-from-bottom duration-300">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#475569] uppercase tracking-widest px-1">Board Name</label>
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name your map..."
                className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:ring-1 focus:ring-indigo-500 outline-none"
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#475569] uppercase tracking-widest px-1">Purpose</label>
              <div className="relative">
                <select
                  value={newPurpose}
                  onChange={(e) => setNewPurpose(e.target.value as BoardPurpose)}
                  className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] outline-none appearance-none cursor-pointer"
                  disabled={loading}
                >
                  {Object.entries(PURPOSE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#475569] text-[10px]">▼</span>
              </div>
            </div>

            <p className="px-1 text-[10px] italic text-[#64748b] leading-relaxed">
              {PURPOSE_CONFIG[newPurpose].preview}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex-1 px-4 py-2 rounded-lg text-xs font-bold text-[#94a3b8] hover:bg-[#1e1e2e] transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/10"
                disabled={!newName.trim() || loading}
              >
                {loading ? 'Creating...' : 'Create Board'}
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  )
}

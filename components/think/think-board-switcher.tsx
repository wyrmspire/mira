'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COPY } from '@/lib/studio-copy'
import { ThinkBoard } from '@/types/mind-map'

interface ThinkBoardSwitcherProps {
  boards: ThinkBoard[]
  activeBoardId: string
}

export function ThinkBoardSwitcher({ boards, activeBoardId }: ThinkBoardSwitcherProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0]

  const handleSwitch = (boardId: string) => {
    router.push(`/map?boardId=${boardId}`)
    setIsOpen(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBoardName.trim()) return

    try {
      const resp = await fetch('/api/mindmap/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBoardName })
      })
      
      if (resp.ok) {
        const newBoard = await resp.json()
        router.push(`/map?boardId=${newBoard.id}`)
        router.refresh()
        setIsCreating(false)
        setNewBoardName('')
        setIsOpen(false)
      }
    } catch (err) {
      console.error('Failed to create board:', err)
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e1e2e] border border-[#2e2e3e] hover:border-[#4338ca] transition-all group"
      >
        <span className="text-xs font-semibold text-[#818cf8]">
          {activeBoard?.name}
        </span>
        <span className={`text-[#94a3b8] transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-[#0a0a1a] border border-[#1e1e2e] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-2 flex flex-col gap-1 max-h-64 overflow-y-auto">
              {boards.map(board => (
                <button
                  key={board.id}
                  onClick={() => handleSwitch(board.id)}
                  className={`
                    flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-left transition-colors
                    ${board.id === activeBoardId 
                      ? 'bg-[#1e1e2e] text-[#f8fafc]' 
                      : 'text-[#94a3b8] hover:bg-[#1e1e2e] hover:text-[#f8fafc]'}
                  `}
                >
                  <span className="truncate">{board.name}</span>
                  {board.id === activeBoardId && <span className="text-[#818cf8]">✓</span>}
                </button>
              ))}
            </div>

            <div className="border-t border-[#1e1e2e] p-2 bg-[#050510]/50">
              {isCreating ? (
                <form onSubmit={handleCreate} className="flex flex-col gap-2 p-1">
                  <input
                    autoFocus
                    type="text"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    placeholder="Board name..."
                    className="w-full bg-[#0a0a1a] border border-[#2e2e3e] rounded-md px-2 py-1.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#4338ca]"
                  />
                  <div className="flex gap-2">
                    <button 
                      type="submit"
                      disabled={!newBoardName.trim()}
                      className="flex-1 px-3 py-1.5 bg-[#4338ca] hover:bg-[#4f46e5] disabled:opacity-50 text-xs font-medium rounded-md text-white transition-colors"
                    >
                      Create
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-3 py-1.5 bg-[#1e1e2e] hover:bg-[#2e2e3e] text-xs font-medium rounded-md text-[#94a3b8] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold text-[#818cf8] hover:bg-[#1e1e2e] transition-colors"
                >
                  <span>+</span>
                  {COPY.mindMap.actions.createBoard}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

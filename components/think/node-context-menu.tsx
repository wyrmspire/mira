'use client'

import React, { useEffect, useRef } from 'react'

interface NodeContextMenuProps {
  x: number
  y: number
  node: any
  onClose: () => void
  onOpenModal: (node: any) => void
  onAddChild: (nodeId: string) => void
  onDelete: (nodeId: string) => void
  onColorChange: (nodeId: string, color: string) => void
  onExport: (node: any, type: 'idea' | 'goal' | 'knowledge') => void
}

export function NodeContextMenu({
  x,
  y,
  node,
  onClose,
  onOpenModal,
  onAddChild,
  onDelete,
  onColorChange,
  onExport
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const colors = [
    { label: 'Default', hex: '#3f3f46' },
    { label: 'Indigo', hex: '#6366f1' },
    { label: 'Emerald', hex: '#10b981' },
    { label: 'Amber', hex: '#f59e0b' },
    { label: 'Red', hex: '#ef4444' }
  ]

  return (
    <div 
      ref={menuRef}
      className="fixed z-[100] w-64 bg-[#12121a] border border-[#1e1e2e] rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-2 border-b border-[#1e1e2e] mb-1">
        <span className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest leading-none">
          Node Actions • {node.id.slice(0, 8)}
        </span>
      </div>

      <button 
        onClick={() => { onOpenModal(node); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#94a3b8] hover:text-white hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
      >
        <span className="text-base">⋯</span>
        Edit Details
      </button>

      <button 
        onClick={() => { onAddChild(node.id); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#94a3b8] hover:text-white hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
      >
        <span className="text-base">+</span>
        Add Child Node
      </button>

      <div className="group relative">
        <button 
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-xs text-[#94a3b8] group-hover:text-white group-hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
        >
          <div className="flex items-center gap-3">
            <span 
              className="w-3.5 h-3.5 rounded-full border border-white/20" 
              style={{ backgroundColor: node.data.color || '#3f3f46' }} 
            />
            Change Color
          </div>
          <span className="text-[10px] text-[#4a4a6a]">▶</span>
        </button>

        <div className="absolute top-0 left-full ml-1 hidden group-hover:block w-40 bg-[#12121a] border border-[#1e1e2e] rounded-xl shadow-2xl p-1 animate-in fade-in slide-in-from-left-1 duration-150">
          {colors.map((c) => (
            <button 
              key={c.hex}
              onClick={() => { onColorChange(node.id, c.hex); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-[#94a3b8] hover:text-white hover:bg-[#1e1e2e] rounded-lg transition-all"
            >
              <span className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: c.hex }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-[#1e1e2e] my-1 mx-1" />

      <button 
        onClick={() => { onExport(node, 'idea'); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#94a3b8] hover:text-indigo-400 hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
      >
        <span className="text-base">💡</span>
        Export as Idea
      </button>

      <button 
        onClick={() => { onExport(node, 'goal'); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#94a3b8] hover:text-emerald-400 hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
      >
        <span className="text-base">⌬</span>
        Export as Goal
      </button>

      <button 
        onClick={() => { onExport(node, 'knowledge'); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#94a3b8] hover:text-amber-400 hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
      >
        <span className="text-base">📖</span>
        Export as Knowledge
      </button>

      <div className="h-px bg-[#1e1e2e] my-1 mx-1" />

      <button 
        onClick={() => { onDelete(node.id); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-red-900/40 hover:text-red-400 hover:bg-red-900/10 rounded-xl transition-all font-medium"
      >
        <span className="text-base">−</span>
        Delete Node
      </button>
    </div>
  )
}

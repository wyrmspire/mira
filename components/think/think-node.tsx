'use client'

import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import type { ThinkNode as ThinkNodeData } from '@/types/mind-map'

export const ThinkNode = memo(({ id, data, selected }: NodeProps) => {
  const { label, color, description, content, metadata, onAddChild, onDelete, onOpenModal } = data as unknown as ThinkNodeData & { 
    onAddChild?: (id: string) => void,
    onDelete?: (id: string) => void,
    onOpenModal?: (node: any) => void
  }

  const [isEditing, setIsEditing] = React.useState(false)
  const [editedLabel, setEditedLabel] = React.useState(label)
  const [isRedFlash, setIsRedFlash] = React.useState(false)

  const getBadge = () => {
    if (!metadata?.linkedEntityType) return null;
    switch (metadata.linkedEntityType) {
      case 'goal': return { icon: '⌬', color: 'text-emerald-400', label: 'GOAL' };
      case 'idea': return { icon: '💡', color: 'text-indigo-400', label: 'IDEA' };
      case 'knowledge': return { icon: '📖', color: 'text-amber-400', label: 'KNOW' };
      default: return null;
    }
  };

  const badge = getBadge();

  const handleLabelSubmit = async () => {
    if (editedLabel === label) {
      setIsEditing(false)
      return
    }
    
    try {
      await fetch(`/api/mindmap/nodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editedLabel }),
      })
      // We rely on parent to refresh or just optimistic update here?
      // For now, assume canvas state is updated elsewhere or we just keep local change
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update label:', err)
      setEditedLabel(label)
      setIsEditing(false)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsRedFlash(true)
    setTimeout(() => {
      onDelete?.(id)
    }, 200)
  }

  return (
    <div className={`
      relative group px-3 py-2 min-w-[140px] max-w-[220px]
      bg-[#0a0a1a] border-2 rounded-xl transition-all duration-300 ease-out
      ${selected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#050510] scale-[1.02]' : 'hover:scale-[1.05]'}
      ${isRedFlash ? 'bg-red-900/40 border-red-500' : ''}
    `}
    style={{ borderColor: isRedFlash ? undefined : (color || '#3F3F46') }}>
      
      {/* Node Chrome (Hover) */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
        {/* Delete button */}
        <button 
          className="w-6 h-6 rounded-full bg-[#1e1e2e] border border-red-900/50 text-red-400 flex items-center justify-center text-xs shadow-xl hover:bg-red-900/30 transition-colors"
          onClick={handleDelete}
          title="Delete Node"
        >
          −
        </button>
        
        {/* Details button */}
        <button 
          className="w-6 h-6 rounded-full bg-[#1e1e2e] border border-[#2e2e3e] text-[#94a3b8] flex items-center justify-center text-xs shadow-xl hover:bg-[#2e2e3e] hover:text-white transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal?.({ id, data });
          }}
          title="Edit Details"
        >
          ⋯
        </button>

        {/* Add Child button */}
        <button 
          className="w-6 h-6 rounded-full bg-indigo-600 border border-indigo-400 text-white flex items-center justify-center text-xs shadow-xl hover:bg-indigo-500 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild?.(id);
          }}
          title="Add Child"
        >
          +
        </button>
      </div>

      {/* Target handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-[#27272a] !border-[#3F3F46] !opacity-20 group-hover:!opacity-100 transition-opacity !-top-1.5"
      />

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between h-3">
          <div className="text-[9px] font-bold tracking-tight text-[#94a3b8] uppercase opacity-40">
            {badge?.label || ''}
          </div>
          {badge && (
            <div className={`text-[10px] ${badge.color} font-bold drop-shadow-sm`}>
              {badge.icon}
            </div>
          )}
        </div>
        
        {isEditing ? (
          <input
            autoFocus
            className="w-full bg-transparent font-semibold text-[#f8fafc] text-[13px] leading-tight outline-none border-b border-indigo-500/50"
            value={editedLabel}
            onChange={(e) => setEditedLabel(e.target.value)}
            onBlur={handleLabelSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelSubmit()
              if (e.key === 'Escape') {
                setEditedLabel(label)
                setIsEditing(false)
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div 
            className="font-semibold text-[#f8fafc] text-[13px] leading-tight break-words pr-2 cursor-text"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
          >
            {label}
          </div>
        )}

        {description && (
          <div className="max-h-0 overflow-hidden group-hover:max-h-20 transition-all duration-300">
            <div className="text-[10px] text-[#94a3b8] mt-1.5 leading-relaxed italic border-t border-[#1e1e2e] pt-1.5">
              {description}
            </div>
          </div>
        )}
      </div>

      {/* Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-[#27272a] !border-[#3F3F46] !opacity-20 group-hover:!opacity-100 group-hover:!bg-indigo-500/50 group-hover:!border-indigo-500 transition-all !-bottom-1.5"
      />

      {/* Decorative pulse if selected */}
      {selected && (
        <div className="absolute inset-0 rounded-xl bg-indigo-500/5 animate-pulse pointer-events-none" />
      )}
    </div>
  )
})

ThinkNode.displayName = 'ThinkNode'

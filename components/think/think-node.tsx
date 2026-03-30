'use client'

import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'

export const ThinkNode = memo(({ data, selected }: NodeProps) => {
  const { label, color, description } = data as { 
    label: string, 
    color: string, 
    description?: string 
  }

  return (
    <div className={`
      relative group px-4 py-3 min-w-[180px] max-w-[240px]
      bg-[#0a0a1a] border-2 rounded-xl transition-all duration-200
      ${selected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#050510]' : ''}
    `}
    style={{ borderColor: color || '#3F3F46' }}>
      
      {/* Target handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-[#27272a] !border-[#3F3F46]"
      />

      <div className="flex flex-col gap-1">
        <div className="text-xs font-bold tracking-tight text-[#94a3b8] uppercase opacity-60">
          NODE
        </div>
        <div className="font-semibold text-[#f8fafc] text-sm leading-tight break-words">
          {label}
        </div>
        {description && (
          <div className="text-[10px] text-[#94a3b8] mt-1 line-clamp-2 leading-relaxed italic">
            {description}
          </div>
        )}
      </div>

      {/* Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-[#27272a] !border-[#3F3F46]"
      />

      {/* Decorative pulse if active */}
      {selected && (
        <div className="absolute inset-0 rounded-xl bg-indigo-500/5 animate-pulse pointer-events-none" />
      )}
    </div>
  )
})

ThinkNode.displayName = 'ThinkNode'

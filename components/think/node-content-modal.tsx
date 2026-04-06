'use client'

import React, { useState, useEffect } from 'react'

import type { ThinkNode as ThinkNodeData } from '@/types/mind-map'

interface NodeContentModalProps {
  isOpen: boolean
  onClose: () => void
  node: {
    id: string
    data: ThinkNodeData
  }
}

export function NodeContentModal({ isOpen, onClose, node }: NodeContentModalProps) {
  const [label, setLabel] = useState(node.data.label)
  const [description, setDescription] = useState(node.data.description || '')
  const [content, setContent] = useState(node.data.content || '')
  const [color, setColor] = useState(node.data.color || '#3f3f46')
  const [isSaving, setIsSaving] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  // Sync state when node changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setLabel(node.data.label)
      setDescription(node.data.description || '')
      setContent(node.data.content || '')
      setColor(node.data.color || '#3f3f46')
    }
  }, [isOpen, node])

  if (!isOpen) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // PATCH /api/gpt/update with action: 'update_map_node'
      const resp = await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_map_node',
          payload: {
            nodeId: node.id,
            label,
            description,
            content, // Lane 2 will handle this in service
            color
          }
        }),
      })
      if (!resp.ok) throw new Error('Failed to update node')
      
      onClose()
      window.location.reload()
    } catch (err) {
      console.error('Failed to save node:', err)
      alert('Failed to save node changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = async (type: 'idea' | 'knowledge' | 'goal') => {
    setExporting(type)
    const DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000001';
    
    try {
      let payload = {};

      if (type === 'idea') {
        payload = {
          userId: DEFAULT_USER_ID,
          title: label,
          rawPrompt: content || description || `From mind map node: ${label}`,
          gptSummary: description || label
        };
      } else if (type === 'goal') {
        payload = {
          userId: DEFAULT_USER_ID,
          title: label,
          description: description || label,
          status: 'proposed'
        };
      } else if (type === 'knowledge') {
        payload = {
          userId: DEFAULT_USER_ID,
          title: label,
          content: content || description || `Knowledge unit extracted from mind map: ${label}`,
          topic: label,
          domain: 'Mind Map',
          unit_type: 'guide',
          thesis: description ? description.split('.')[0] : label
        };
      }

      // 1. CREATE Entity via Gateway
      const createResp = await fetch('/api/gpt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload })
      });
      
      if (!createResp.ok) throw new Error(`Export failed for ${type}`);
      const createdEntity = await createResp.json();
      const entityId = createdEntity.id;

      // 2. TWO-WAY BINDING: Update the node with metadata
      const updateResp = await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_map_node',
          payload: {
            nodeId: node.id,
            nodeType: 'exported',
            metadata: {
              ...node.data.metadata,
              linkedEntityId: entityId,
              linkedEntityType: type
            }
          }
        })
      });

      if (!updateResp.ok) throw new Error(`Metadata update failed for node ${node.id}`);
      
      onClose();
      window.location.reload(); 
    } catch (err) {
      console.error(`Export failed for ${type}:`, err);
      alert(`Export failed for ${type}.`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="w-[360px] h-full flex flex-col bg-[#0a0a14] border-l border-[#1e1e2e] shadow-2xl relative z-20 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e2e] bg-[#12121a]">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-bold text-white tracking-tight">Node Elaboration</h2>
          <span className="text-[10px] font-mono text-indigo-400/80 uppercase tracking-widest">
            {node.data.nodeType || 'manual'} node • {node.id.slice(0, 8)}
          </span>
        </div>
        <button 
          onClick={onClose} 
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1e1e2e] hover:bg-[#2e2e3e] text-[#64748b] hover:text-white transition-all shadow-sm"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* Label */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Title</label>
          <input 
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full bg-[#050510] border border-[#1e1e2e] rounded-xl px-4 py-3 text-[#f1f5f9] font-bold focus:border-indigo-500/50 outline-none transition-all placeholder:text-[#334155]"
            placeholder="Give this node a name"
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Hover Summary</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#050510] border border-[#1e1e2e] rounded-xl px-4 py-3 text-[#94a3b8] text-sm leading-relaxed focus:border-indigo-500/50 outline-none transition-all resize-none placeholder:text-[#334155]"
              placeholder="A brief summary for the canvas view..."
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Visual Theme</label>
            <div className="flex flex-wrap gap-2 p-3 bg-[#050510] border border-[#1e1e2e] rounded-xl">
              {['#3f3f46', '#6366f1', '#10b981', '#f59e0b', '#ef4444'].map((c) => (
                <button 
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Deep Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pl-1">
            <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest">Deep Content</label>
            <span className="text-[9px] text-indigo-400 font-mono">MD SUPPORTED</span>
          </div>
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full bg-[#050510] border border-[#1e1e2e] rounded-xl px-4 py-4 text-[#e2e8f0] text-sm leading-relaxed focus:border-indigo-500/50 outline-none transition-all resize-none placeholder:text-[#334155] font-mono"
            placeholder="Elaborate on your thinking here. Notes, research, data points, paragraphs..."
          />
        </div>

        {/* Export Actions */}
        <div className="space-y-3 pt-2">
          <h3 className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Export to Studio</h3>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => handleExport('idea')}
              disabled={!!exporting}
              className="group relative px-4 py-3 bg-[#0d0d18] border border-[#1e1e2e] hover:border-indigo-500/40 rounded-xl transition-all flex items-center justify-between text-left"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-[#f1f5f9]">Draft Idea</span>
                <span className="text-[10px] text-[#64748b] group-hover:text-indigo-400 transition-colors">Capture for review</span>
              </div>
              <span className="text-[#64748b] group-hover:text-indigo-400 transition-colors text-lg leading-none">+</span>
              {exporting === 'idea' && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500 animate-pulse" />}
            </button>

            <button 
              onClick={() => handleExport('goal')}
              disabled={!!exporting}
              className="group relative px-4 py-3 bg-[#0d0d18] border border-[#1e1e2e] hover:border-emerald-500/40 rounded-xl transition-all flex items-center justify-between text-left"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-[#f1f5f9]">Create Goal</span>
                <span className="text-[10px] text-[#64748b] group-hover:text-emerald-400 transition-colors">Target outcome</span>
              </div>
              <span className="text-[#64748b] group-hover:text-emerald-400 transition-colors text-lg leading-none">+</span>
              {exporting === 'goal' && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500 animate-pulse" />}
            </button>

            <button 
              onClick={() => handleExport('knowledge')}
              disabled={!!exporting}
              className="group relative px-4 py-3 bg-[#0d0d18] border border-[#1e1e2e] hover:border-amber-500/40 rounded-xl transition-all flex items-center justify-between text-left"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-[#f1f5f9]">Save Knowledge</span>
                <span className="text-[10px] text-[#64748b] group-hover:text-amber-400 transition-colors">Add to library</span>
              </div>
              <span className="text-[#64748b] group-hover:text-amber-400 transition-colors text-lg leading-none">+</span>
              {exporting === 'knowledge' && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500 animate-pulse" />}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-2 p-6 border-t border-[#1e1e2e] bg-[#12121a]">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Commit Changes'}
        </button>
        <button 
          onClick={onClose}
          className="w-full py-2 text-xs font-bold text-[#94a3b8] hover:text-white transition-colors"
        >
          Discard
        </button>
      </div>
    </div>
  )
}

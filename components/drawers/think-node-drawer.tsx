'use client'

import React, { useState } from 'react'

interface ThinkNodeDrawerProps {
  node: {
    id: string;
    data: {
      label: string;
      description?: string;
      color?: string;
      nodeType?: string;
    }
  }
  onClose: () => void
}

export function ThinkNodeDrawer({ node, onClose }: ThinkNodeDrawerProps) {
  const [label, setLabel] = useState(node.data.label)
  const [description, setDescription] = useState(node.data.description || '')
  const [color, setColor] = useState(node.data.color || '#3f3f46')
  const [isSaving, setIsSaving] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const resp = await fetch(`/api/mindmap/nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, description, color }),
      })
      if (!resp.ok) throw new Error('Failed to update node')
      
      // We'll close the drawer but the canvas might need state sync.
      // Standard Mira pattern for simple updates is to reload map or use custom event.
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
      let endpoint = '';
      let payload = {};

      if (type === 'idea') {
        endpoint = '/api/ideas';
        payload = {
          userId: DEFAULT_USER_ID,
          title: label,
          rawPrompt: description || `From mind map node: ${label}`,
          gptSummary: description || label
        };
      } else if (type === 'goal') {
        endpoint = '/api/goals';
        payload = {
          userId: DEFAULT_USER_ID,
          title: label,
          description: description || label,
          status: 'proposed'
        };
      } else if (type === 'knowledge') {
        // Simple bridge for now
        alert('Refinement flow triggered for Knowledge Unit creation.');
        return;
      }

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!resp.ok) throw new Error(`Export failed for ${type}`);
      
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} created successfully!`);
    } catch (err) {
      console.error(`Export failed for ${type}:`, err);
      alert(`Export failed for ${type}.`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-bold text-white tracking-tight">Node Insight</h2>
          <span className="text-[10px] font-mono text-indigo-400/80 uppercase tracking-widest">
            {node.data.nodeType || 'manual'} node
          </span>
        </div>
        <button 
          onClick={onClose} 
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1e1e2e] hover:bg-[#2e2e3e] text-[#64748b] hover:text-white transition-all shadow-sm"
        >
          ✕
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Label</label>
          <input 
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full bg-[#0a0a1a] border border-[#1e1e2e] rounded-xl px-4 py-3 text-[#e2e8f0] font-medium focus:border-indigo-500/50 outline-none transition-all"
            placeholder="Node title"
          />
        </div>

        <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Description & Context</label>
            <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full bg-[#0a0a1a] border border-[#1e1e2e] rounded-xl px-4 py-4 text-[#e2e8f0] focus:border-indigo-500/50 outline-none transition-all resize-none text-sm leading-relaxed"
                placeholder="What is the significance of this node?"
            />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Visual Theme</label>
          <div className="flex gap-2.5">
            {['#3f3f46', '#6366f1', '#10b981', '#f59e0b', '#ef4444'].map((c) => (
              <button 
                key={c}
                onClick={() => setColor(c)}
                className={`w-10 h-10 rounded-xl border-2 transition-all ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-[#1e1e2e] space-y-6">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? 'Processing...' : 'Save Changes'}
        </button>

        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Bridge to Studio</h3>
          
          <div className="grid grid-cols-1 gap-2">
            <button 
              onClick={() => handleExport('idea')}
              disabled={!!exporting}
              className="group relative w-full py-4 bg-[#0d0d18] border border-[#1e1e2e] hover:border-indigo-500/30 rounded-2xl transition-all flex flex-col items-start px-5 gap-0.5 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/30 group-hover:bg-indigo-500 transition-colors" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#e2e8f0]">Draft as Idea</span>
                {exporting === 'idea' && <span className="text-[10px] text-indigo-400 animate-pulse">Sending...</span>}
              </div>
              <span className="text-[10px] text-[#64748b]">Save for structured definition later</span>
            </button>

            <button 
                onClick={() => handleExport('goal')}
                disabled={!!exporting}
                className="group relative w-full py-4 bg-[#0d0d18] border border-[#1e1e2e] hover:border-emerald-500/30 rounded-2xl transition-all flex flex-col items-start px-5 gap-0.5 overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/30 group-hover:bg-emerald-500 transition-colors" />
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#e2e8f0]">Create Goal</span>
                    {exporting === 'goal' && <span className="text-[10px] text-emerald-400 animate-pulse">Creating...</span>}
                </div>
                <span className="text-[10px] text-[#64748b]">Mark as a serious accomplishment target</span>
            </button>

            <button 
              onClick={() => handleExport('knowledge')}
              disabled={!!exporting}
              className="group relative w-full py-4 bg-[#0d0d18] border border-[#1e1e2e] hover:border-[#818cf8]/30 rounded-2xl transition-all flex flex-col items-start px-5 gap-0.5 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-[#818cf8]/30 group-hover:bg-[#818cf8] transition-colors" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#e2e8f0]">Save as Knowledge Unit</span>
                {exporting === 'knowledge' && <span className="text-[10px] text-[#818cf8] animate-pulse">Refining...</span>}
              </div>
              <span className="text-[10px] text-[#64748b]">Bridge to the research & mastery loop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

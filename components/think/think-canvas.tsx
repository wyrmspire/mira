'use client'

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import { ThinkNode } from './think-node'
import { NodeContentModal } from './node-content-modal'
import { NodeContextMenu } from './node-context-menu'
import Link from 'next/link'
import type { ThinkNode as ThinkNodeData, ThinkEdge as ThinkEdgeData } from '@/types/mind-map'

const nodeTypes = {
  think: ThinkNode,
}

interface ThinkCanvasProps {
  boardId: string
  initialNodes: ThinkNodeData[]
  initialEdges: ThinkEdgeData[]
  userId: string
  boards: any[]
}

function ThinkCanvasInner({ boardId, initialNodes, initialEdges, userId, boards }: ThinkCanvasProps) {
  const { screenToFlowPosition, getIntersectingNodes, fitView } = useReactFlow()
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeModalNode, setActiveModalNode] = useState<any>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: Node } | null>(null)
  const [memoryCounts, setMemoryCounts] = useState<Record<string, number>>({})
  const [isAiLoading, setIsAiLoading] = useState(false)

  // Ref to break circular dependency: callbacks read current nodes without re-creating
  const nodesRef = useRef<Node[]>(nodes)
  nodesRef.current = nodes

  // Persistence: Node Position Update (Optimistic + Silent)
  const persistNodePosition = useCallback(async (nodeId: string, x: number, y: number) => {
    try {
      await fetch(`/api/mindmap/nodes/${nodeId}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y }),
      })
    } catch (err) {
      console.error('Failed to persist node position:', err)
    }
  }, [])

  const fetchMemoryCounts = useCallback(async () => {
    try {
      const resp = await fetch('/api/gpt/memory')
      if (resp.ok) {
        const memories = await resp.json()
        const counts: Record<string, number> = {}
        memories.forEach((m: any) => {
          const nodeId = m.metadata?.nodeId || m.metadata?.linkedNodeId
          if (nodeId) {
            counts[nodeId] = (counts[nodeId] || 0) + 1
          }
        })
        setMemoryCounts(counts)
      }
    } catch (err) {
      console.warn('Failed to fetch memory counts:', err)
    }
  }, [])

  const onDeleteNode = useCallback(async (nodeId: string) => {
    // Optimistic delete: remove node and connected edges
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))

    try {
      await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_map_node',
          payload: { nodeId }
        })
      })
    } catch (err) {
      console.error('Failed to delete node:', err)
      // On error, we might want to revert or just refresh boards
      window.location.reload()
    }
  }, [setNodes, setEdges])

  const onColorChange = useCallback(async (nodeId: string, color: string) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, color } } : n))
    
    try {
      await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_map_node',
          payload: { nodeId, color }
        })
      })
    } catch (err) {
      console.warn('Failed to persist color update:', err)
    }
  }, [setNodes])

  const onAddChild = useCallback(async (parentNodeId: string) => {
    const parentNode = nodesRef.current.find(n => n.id === parentNodeId);
    if (!parentNode) return;

    const x = parentNode.position.x + 250;
    const y = parentNode.position.y;

    // Local optimistic placeholder (optional, but keep it robust)
    const tempId = crypto.randomUUID();
    
    setNodes((nds) => [...nds, {
      id: tempId,
      type: 'think',
      position: { x, y },
      data: { label: 'New Node', color: parentNode.data.color, nodeType: 'manual' }
    }])

    try {
      const resp = await fetch('/api/gpt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'map_node',
          payload: { userId, boardId, label: 'New Child', position_x: x, position_y: y, parentNodeId }
        })
      })
      
      if (resp.ok) {
        const newNodeData = await resp.json()
        
        // Finalize node ID and link
        setNodes((nds) => nds.map(n => n.id === tempId ? { ...n, id: newNodeData.id } : n))

        const edgeResp = await fetch('/api/gpt/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'map_edge',
            payload: { boardId, sourceNodeId: parentNodeId, targetNodeId: newNodeData.id }
          })
        })

        if (edgeResp.ok) {
          const newEdgeData = await edgeResp.json()
          setEdges((eds) => addEdge({
            id: newEdgeData.id,
            source: parentNodeId,
            target: newNodeData.id,
            style: { stroke: '#3F464E' }
          }, eds))
        }
      }
    } catch (err) {
      console.error('Failed to create child node:', err)
      setNodes((nds) => nds.filter(n => n.id !== tempId))
    }
  }, [boardId, userId, setNodes, setEdges])

  const onExpandBranch = useCallback(async (nodeId: string) => {
    setIsAiLoading(true)
    try {
      const resp = await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'expand_board_branch',
          payload: { boardId, nodeId, userId }
        })
      })
      if (resp.ok) {
        // AI flow returns suggested nodes, but we might need to refresh 
        // to see the real DB records. For simplicity, we reload.
        window.location.reload()
      }
    } catch (err) {
      console.error('AI Expansion failed:', err)
    } finally {
      setIsAiLoading(false)
    }
  }, [boardId, userId])

  const onSuggestGaps = useCallback(async () => {
    setIsAiLoading(true)
    try {
      const resp = await fetch('/api/gpt/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest_board_gaps',
          payload: { boardId, userId }
        })
      })
      if (resp.ok) {
        // Usually shows a toast or opens a drawer with suggestions
        // For now, reload to see if AI auto-created any gaps (or just notify)
        alert('AI is analyzing gaps. Check back in a moment.')
      }
    } catch (err) {
      console.error('Gap analysis failed:', err)
    } finally {
      setIsAiLoading(false)
    }
  }, [boardId, userId])

  const onLinkMemory = useCallback(async (nodeId: string) => {
    alert(`Node ${nodeId} memory linking mode. (Select memories in Explorer to link)`)
  }, [])

  const onReparent = useCallback(async (nodeId: string, newParentId: string) => {
    // Optimistically update edges (remove incoming, add new)
    setEdges((eds) => {
      const filtered = eds.filter(e => e.target !== nodeId);
      return addEdge({ 
        id: crypto.randomUUID(), 
        source: newParentId, 
        target: nodeId, 
        style: { stroke: '#3F464E' } 
      }, filtered);
    });

    try {
      await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reparent_node',
          payload: { boardId, nodeId, sourceNodeId: newParentId }
        })
      });
    } catch (err) {
      console.error('Failed to reparent node:', err);
      window.location.reload();
    }
  }, [boardId, setEdges]);

  // Map our service nodes to xyflow nodes
  const mapNodes = useCallback((nodesData: ThinkNodeData[]): Node[] => {
    return nodesData.map((node) => ({
      id: node.id,
      type: 'think',
      position: { x: node.positionX, y: node.positionY },
      data: {
        label: node.label,
        description: node.description,
        content: node.content,
        color: node.color,
        nodeType: node.nodeType,
        metadata: node.metadata,
        memoryCount: memoryCounts[node.id] || 0,
        onAddChild,
        onDelete: onDeleteNode,
        onOpenModal: (n: any) => {
          setActiveModalNode(n)
          setIsSidebarOpen(true)
        }
      },
      selected: false,
    }))
  }, [onAddChild, onDeleteNode, memoryCounts])

  // Map our service edges to xyflow edges
  const mapEdges = useCallback((edgesData: ThinkEdgeData[]): Edge[] => {
    return edgesData.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      label: edge.edgeType === 'ai_generated' ? 'AI Link' : undefined,
      animated: edge.edgeType === 'ai_generated',
      style: { stroke: edge.edgeType === 'ai_generated' ? '#6366f1' : '#3F464E' },
    }))
  }, [])

  // Initialize nodes/edges when boardId changes
  useEffect(() => {
    setNodes(mapNodes(initialNodes))
    setEdges(mapEdges(initialEdges))
    setContextMenu(null)
    setActiveModalNode(null)
    fetchMemoryCounts()
  }, [boardId, initialNodes, initialEdges, setNodes, setEdges, mapNodes, mapEdges, fetchMemoryCounts])

  const onConnect: OnConnect = useCallback(
    async (params: Connection) => {
      try {
        const resp = await fetch('/api/gpt/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'map_edge',
            payload: {
              boardId,
              sourceNodeId: params.source,
              targetNodeId: params.target,
            }
          })
        })
        
        if (resp.ok) {
          const newEdge = await resp.json()
          setEdges((eds) => addEdge({ 
            id: newEdge.id,
            source: params.source!,
            target: params.target!,
            style: { stroke: '#3F464E' } 
          }, eds))
        }
      } catch (err) {
        console.error('Failed to create edge:', err)
      }
    },
    [boardId, setEdges]
  )

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      persistNodePosition(node.id, node.position.x, node.position.y)
      
      const intersections = getIntersectingNodes(node);
      if (intersections.length > 0) {
        const targetNode = intersections[0];
        // Edge-based reparenting (Lock 4)
        onReparent(node.id, targetNode.id);
      }
    },
    [persistNodePosition, getIntersectingNodes, onConnect]
  )

  const onPaneDoubleClick = useCallback(async (event: React.MouseEvent) => {
    const { x, y } = screenToFlowPosition({ x: event.clientX, y: event.clientY })

    try {
      const resp = await fetch('/api/gpt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'map_node',
          payload: { userId, boardId, label: 'New Node', position_x: x, position_y: y }
        })
      })
      
      if (resp.ok) {
        const newNode = await resp.json()
        setNodes((nds) => [...nds, {
          id: newNode.id,
          type: 'think',
          position: { x, y },
          data: { 
            label: newNode.label, 
            color: newNode.color, 
            nodeType: 'manual',
            onAddChild,
            onDelete: onDeleteNode,
            onOpenModal: (n: any) => setActiveModalNode(n)
          },
        }])
      }
    } catch (err) {
      console.error('Failed to create node:', err)
    }
  }, [screenToFlowPosition, boardId, userId, setNodes, onAddChild, onDeleteNode])

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, node })
  }, [])

  const onExportEntity = useCallback(async (node: any, type: string) => {
    setActiveModalNode(node)
  }, [])

  const onNodesDelete = useCallback((nodesToDelete: Node[]) => {
    nodesToDelete.forEach(n => onDeleteNode(n.id))
  }, [onDeleteNode])

  const onEdgesDelete = useCallback(async (edgesToDelete: Edge[]) => {
    for (const edge of edgesToDelete) {
      try {
        await fetch('/api/gpt/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete_map_edge',
            payload: { edgeId: edge.id }
          })
        })
      } catch (err) {
        console.warn('Failed to persist edge deletion:', err)
      }
    }
  }, [])

  const onExplode = useCallback(() => {
    const currentNodes = nodesRef.current
    const currentEdges = edges

    if (currentNodes.length === 0) return

    const NODE_W = 160
    const NODE_H = 70
    const PADDING = 20
    const IDEAL_DIST_BASE = 140
    const IDEAL_DIST_PER_CHILD = 30
    const ATTRACTION = 0.08
    const REPULSION = 5000
    const ITERATIONS = 120
    const DAMPING = 0.9
    const MAX_FORCE = 50
    const TEMP_START = 1.0
    const TEMP_END = 0.05

    const adj = new Map<string, Set<string>>()
    const edgeSet = new Set<string>()
    for (const node of currentNodes) adj.set(node.id, new Set())
    for (const edge of currentEdges) {
      adj.get(edge.source)?.add(edge.target)
      adj.get(edge.target)?.add(edge.source)
      edgeSet.add(`${edge.source}|${edge.target}`)
      edgeSet.add(`${edge.target}|${edge.source}`)
    }

    const weight = new Map<string, number>()
    for (const node of currentNodes) {
      const visited = new Set<string>()
      const q = [node.id]
      visited.add(node.id)
      while (q.length > 0) {
        const nid = q.shift()!
        for (const nbr of Array.from(adj.get(nid) ?? [])) {
          if (!visited.has(nbr)) { visited.add(nbr); q.push(nbr) }
        }
      }
      weight.set(node.id, visited.size)
    }

    const idealDist = (a: string, b: string) => {
      const wa = weight.get(a) ?? 1
      const wb = weight.get(b) ?? 1
      return IDEAL_DIST_BASE + Math.log2(wa + wb) * IDEAL_DIST_PER_CHILD
    }

    const sorted = [...currentNodes].sort((a, b) => 
      (adj.get(b.id)?.size ?? 0) - (adj.get(a.id)?.size ?? 0)
    )
    
    type Pt = { x: number; y: number }
    const pos = new Map<string, Pt>()
    const vel = new Map<string, Pt>()
    
    pos.set(sorted[0].id, { x: 0, y: 0 })
    vel.set(sorted[0].id, { x: 0, y: 0 })
    
    const placed = new Set([sorted[0].id])
    const bfsQ = [sorted[0].id]

    while (bfsQ.length > 0) {
      const nid = bfsQ.shift()!
      const npos = pos.get(nid)!
      const nbrs = Array.from(adj.get(nid) ?? []).filter(n => !placed.has(n))
      
      const angle0 = placed.size * 0.618 * 2 * Math.PI
      nbrs.forEach((nbr, i) => {
        const angle = angle0 + (2 * Math.PI * i) / Math.max(nbrs.length, 1)
        const r = idealDist(nid, nbr) * 0.6
        pos.set(nbr, { x: npos.x + r * Math.cos(angle), y: npos.y + r * Math.sin(angle) })
        vel.set(nbr, { x: 0, y: 0 })
        placed.add(nbr)
        bfsQ.push(nbr)
      })
    }

    for (const node of currentNodes) {
      if (!pos.has(node.id)) {
        pos.set(node.id, { x: 0, y: 300 })
        vel.set(node.id, { x: 0, y: 0 })
      }
    }

    const ids = currentNodes.map(n => n.id)
    const n = ids.length

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const temp = TEMP_START - (TEMP_START - TEMP_END) * (iter / ITERATIONS)
      const forces = new Map<string, Pt>()
      for (const id of ids) forces.set(id, { x: 0, y: 0 })

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = ids[i], b = ids[j]
          const pa = pos.get(a)!, pb = pos.get(b)!
          let dx = pb.x - pa.x
          let dy = pb.y - pa.y
          let dist = Math.sqrt(dx * dx + dy * dy) || 0.1
          const force = REPULSION / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          const fa = forces.get(a)!, fb = forces.get(b)!
          fa.x -= fx; fa.y -= fy
          fb.x += fx; fb.y += fy
        }
      }

      for (const edge of currentEdges) {
        const a = edge.source, b = edge.target
        if (!pos.has(a) || !pos.has(b)) continue
        const pa = pos.get(a)!, pb = pos.get(b)!
        let dx = pb.x - pa.x
        let dy = pb.y - pa.y
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.1
        const target = idealDist(a, b)
        const force = ATTRACTION * (dist - target)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        const fa = forces.get(a)!, fb = forces.get(b)!
        fa.x += fx; fa.y += fy
        fb.x -= fx; fb.y -= fy
      }

      for (const id of ids) {
        const f = forces.get(id)!, v = vel.get(id)!, p = pos.get(id)!
        v.x = (v.x + f.x) * DAMPING * temp
        v.y = (v.y + f.y) * DAMPING * temp
        const speed = Math.sqrt(v.x * v.x + v.y * v.y)
        if (speed > MAX_FORCE) {
          v.x = (v.x / speed) * MAX_FORCE
          v.y = (v.y / speed) * MAX_FORCE
        }
        p.x += v.x
        p.y += v.y
      }
    }

    setNodes((nds) => nds.map(n => {
      const p = pos.get(n.id)
      return p ? { ...n, position: { x: Math.round(p.x), y: Math.round(p.y) } } : n
    }))

    setTimeout(() => {
      try { fitView({ padding: 0.12, duration: 600 }) } catch {}
    }, 50)
  }, [edges, setNodes, fitView])

  return (
    <div className="flex w-full h-full">
      <div 
        style={{ width: '100%', height: '100%' }} 
        className="flex-1 bg-[#050510] relative"
        onClick={() => setContextMenu(null)}
      >
        {/* Back Button */}
        <div className="absolute top-6 left-6 z-20">
          <Link href="/" className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1e1e2e]/80 border border-[#2e2e3e] text-[#f1f5f9] hover:bg-[#2e2e3e] hover:shadow-lg transition-all backdrop-blur-md" title="Back to Studio">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDoubleClick={onPaneDoubleClick}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          onNodeDoubleClick={(_: React.MouseEvent, node: Node) => {
            setActiveModalNode(node)
            setIsSidebarOpen(true)
          }}
          onNodeContextMenu={onNodeContextMenu}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          deleteKeyCode={['Delete', 'Backspace']}
          fitView
          colorMode="dark"
        >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
        <Controls position="bottom-right" showInteractive={false} className="!bg-[#1e1e2e] !border-[#2e2e3e] !fill-[#f1f5f9]" />
        <MiniMap 
          nodeColor={(n: any) => n.data?.color || '#3F3F46'} 
          maskColor="rgba(5, 5, 16, 0.7)"
          className="!bg-[#0a0a1a] !border-[#1e1e2e]" 
        />
        <Panel position="top-right" className="flex items-center gap-2">
            {isAiLoading && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/50 text-xs font-bold text-indigo-400 animate-pulse">
                <span>🪄</span>
                AI Thinking...
              </div>
            )}
            <button
              onClick={onExplode}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 border border-indigo-400/30 text-xs font-bold text-white shadow-2xl transition-all hover:scale-105 active:scale-95"
              title="Auto-layout: arrange nodes into a clean tree"
            >
              💥 Explode
            </button>
            <div className="px-3 py-1.5 rounded-lg bg-[#1e1e2e] border border-[#2e2e3e] text-xs font-medium text-[#94a3b8] shadow-2xl">
              Double Click — New Node • Right Click — Menu • Delete Key — Remove
            </div>
        </Panel>
      </ReactFlow>
      
      {/* Sidebar Expand Handle */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-1/2 right-0 -translate-y-1/2 w-8 h-16 bg-[#1e1e2e] border-y border-l border-[#2e2e3e] rounded-l-xl z-30 flex items-center justify-center text-[#64748b] hover:text-white hover:bg-[#2e2e3e] shadow-lg transition-all"
        >
          <span className="text-xl">‹</span>
        </button>
      )}
      </div>

      {isSidebarOpen && (
        <div className="flex-shrink-0 relative z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] h-full bg-[#0a0a14] border-l border-[#1e1e2e]">
          {/* Sidebar Collapse Handle */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-1/2 -left-8 -translate-y-1/2 w-8 h-16 bg-[#0a0a14] border-y border-l border-[#1e1e2e] rounded-l-xl z-50 flex items-center justify-center text-[#64748b] hover:text-white hover:bg-[#1e1e2e] transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.2)]"
          >
            <span className="text-xl">›</span>
          </button>
          
          {activeModalNode ? (
            <NodeContentModal 
              isOpen={!!activeModalNode} 
              node={activeModalNode} 
              onClose={() => setActiveModalNode(null)} 
            />
          ) : (
            <div className="w-[360px] h-full flex flex-col items-center justify-center p-8 text-center text-[#64748b]">
              <div className="w-16 h-16 rounded-full bg-[#1e1e2e] flex items-center justify-center mb-4 opacity-50">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-sm font-bold text-[#e2e8f0] mb-2">Select a Node</h3>
              <p className="text-xs leading-relaxed">
                Click on any node in the map to view its details, elaborate its content, or export it to the studio.
              </p>
            </div>
          )}
        </div>
      )}

      {contextMenu && (
        <NodeContextMenu 
          {...contextMenu}
          onClose={() => setContextMenu(null)}
          onOpenModal={setActiveModalNode}
          onAddChild={onAddChild}
          onDelete={onDeleteNode}
          onColorChange={onColorChange}
          onExport={onExportEntity}
          onExpandBranch={onExpandBranch}
          onSuggestGaps={onSuggestGaps}
          onLinkMemory={onLinkMemory}
        />
      )}
    </div>
  )
}

export function ThinkCanvas(props: ThinkCanvasProps) {
  return (
    <ReactFlowProvider>
      <ThinkCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

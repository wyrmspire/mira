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
import type { ThinkNode as ThinkNodeData, ThinkEdge as ThinkEdgeData } from '@/types/mind-map'

const nodeTypes = {
  think: ThinkNode,
}

interface ThinkCanvasProps {
  boardId: string
  initialNodes: ThinkNodeData[]
  initialEdges: ThinkEdgeData[]
  userId: string
}

function ThinkCanvasInner({ boardId, initialNodes, initialEdges, userId }: ThinkCanvasProps) {
  const { screenToFlowPosition, getIntersectingNodes, fitView } = useReactFlow()
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // UI State
  const [activeModalNode, setActiveModalNode] = useState<any>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: Node } | null>(null)

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
  }, [boardId, userId, setNodes, setEdges, onDeleteNode])

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
        onAddChild,
        onDelete: onDeleteNode,
        onOpenModal: (n: any) => setActiveModalNode(n)
      },
      selected: false,
    }))
  }, [onAddChild, onDeleteNode])

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
  }, [boardId, initialNodes, initialEdges, setNodes, setEdges, mapNodes, mapEdges])

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
        onConnect({ source: targetNode.id, target: node.id, sourceHandle: null, targetHandle: null });
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
    // Logic from drawer - we could extract this to a hook or helper if reused
    // For now, simpler to just open modal which has these buttons.
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

  // ---------------------------------------------------------------------------
  // Explode: force-directed web layout (visual only — does NOT persist to DB)
  //
  // Multi-pass simulation:
  //   Pass 1: Seed initial positions via BFS from the most-connected hub
  //   Pass 2–N: Force simulation
  //     - ATTRACTION: connected nodes pull toward their ideal distance
  //     - REPULSION:  all node pairs push apart to prevent overlap
  //     - Ideal distance scales with subtree weight (leaf=tight, hub=roomier)
  //   Final: overlap sweep — nudge any remaining collisions
  // ---------------------------------------------------------------------------
  const onExplode = useCallback(() => {
    const currentNodes = nodesRef.current
    const currentEdges = edges

    if (currentNodes.length === 0) return

    // --- Tuning knobs ---
    const NODE_W = 160          // collision box width
    const NODE_H = 70           // collision box height
    const PADDING = 20          // minimum gap between node edges
    const IDEAL_DIST_BASE = 140 // ideal spring length for leaf-to-leaf
    const IDEAL_DIST_PER_CHILD = 30  // extra ideal distance per subtree child
    const ATTRACTION = 0.08     // spring pull strength
    const REPULSION = 5000      // repulsion constant (higher = pushier)
    const ITERATIONS = 120      // simulation passes
    const DAMPING = 0.9         // velocity damping per tick 
    const MAX_FORCE = 50        // cap per-tick displacement
    const TEMP_START = 1.0      // initial temperature (movement scale)
    const TEMP_END = 0.05       // final temperature

    // --- Build adjacency ---
    const adj = new Map<string, Set<string>>()
    const edgeSet = new Set<string>() // "a|b" for quick connected check
    for (const node of currentNodes) adj.set(node.id, new Set())
    for (const edge of currentEdges) {
      adj.get(edge.source)?.add(edge.target)
      adj.get(edge.target)?.add(edge.source)
      edgeSet.add(`${edge.source}|${edge.target}`)
      edgeSet.add(`${edge.target}|${edge.source}`)
    }
    const isConnected = (a: string, b: string) => edgeSet.has(`${a}|${b}`)

    // --- Compute subtree weight (BFS descendant count) for each node ---
    // More descendants = heavier = needs more space
    const weight = new Map<string, number>()
    for (const node of currentNodes) {
      // Count reachable nodes from this node (excluding itself)
      const visited = new Set<string>()
      const q = [node.id]
      visited.add(node.id)
      while (q.length > 0) {
        const nid = q.shift()!
        for (const nbr of Array.from(adj.get(nid) ?? [])) {
          if (!visited.has(nbr)) { visited.add(nbr); q.push(nbr) }
        }
      }
      weight.set(node.id, visited.size) // includes self
    }

    // --- Ideal distance between two connected nodes ---
    const idealDist = (a: string, b: string) => {
      const wa = weight.get(a) ?? 1
      const wb = weight.get(b) ?? 1
      // Heavier nodes get more room, but logarithmic so it doesn't blow up
      return IDEAL_DIST_BASE + Math.log2(wa + wb) * IDEAL_DIST_PER_CHILD
    }

    // --- Seed positions: BFS from most-connected node ---
    const sorted = [...currentNodes].sort((a, b) => 
      (adj.get(b.id)?.size ?? 0) - (adj.get(a.id)?.size ?? 0)
    )
    
    type Pt = { x: number; y: number }
    const pos = new Map<string, Pt>()
    const vel = new Map<string, Pt>()
    
    // Tight initial seeding — close together, let simulation push apart only where needed
    pos.set(sorted[0].id, { x: 0, y: 0 })
    vel.set(sorted[0].id, { x: 0, y: 0 })
    
    const placed = new Set([sorted[0].id])
    const bfsQ = [sorted[0].id]

    while (bfsQ.length > 0) {
      const nid = bfsQ.shift()!
      const npos = pos.get(nid)!
      const nbrs = Array.from(adj.get(nid) ?? []).filter(n => !placed.has(n))
      
      const angle0 = placed.size * 0.618 * 2 * Math.PI // golden angle offset
      nbrs.forEach((nbr, i) => {
        const angle = angle0 + (2 * Math.PI * i) / Math.max(nbrs.length, 1)
        const r = idealDist(nid, nbr) * 0.6 // start tighter than ideal, simulation will adjust
        pos.set(nbr, { x: npos.x + r * Math.cos(angle), y: npos.y + r * Math.sin(angle) })
        vel.set(nbr, { x: 0, y: 0 })
        placed.add(nbr)
        bfsQ.push(nbr)
      })
    }

    // Place any disconnected orphans nearby
    let ox = 0
    for (const node of currentNodes) {
      if (!pos.has(node.id)) {
        pos.set(node.id, { x: ox, y: 300 })
        vel.set(node.id, { x: 0, y: 0 })
        ox += NODE_W + PADDING
      }
    }

    // --- Force simulation ---
    const ids = currentNodes.map(n => n.id)
    const n = ids.length

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const temp = TEMP_START - (TEMP_START - TEMP_END) * (iter / ITERATIONS)
      const forces = new Map<string, Pt>()
      for (const id of ids) forces.set(id, { x: 0, y: 0 })

      // Repulsion: every pair pushes apart (inverse-square, capped)
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = ids[i], b = ids[j]
          const pa = pos.get(a)!, pb = pos.get(b)!
          let dx = pb.x - pa.x
          let dy = pb.y - pa.y
          let dist = Math.sqrt(dx * dx + dy * dy) || 0.1
          
          // Minimum distance based on node size
          const minDist = Math.sqrt(NODE_W * NODE_W + NODE_H * NODE_H) / 2 + PADDING

          const force = REPULSION / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force

          const fa = forces.get(a)!, fb = forces.get(b)!
          fa.x -= fx; fa.y -= fy
          fb.x += fx; fb.y += fy
        }
      }

      // Attraction: connected pairs pull toward ideal distance
      for (const edge of currentEdges) {
        const a = edge.source, b = edge.target
        if (!pos.has(a) || !pos.has(b)) continue
        const pa = pos.get(a)!, pb = pos.get(b)!
        let dx = pb.x - pa.x
        let dy = pb.y - pa.y
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.1
        
        const target = idealDist(a, b)
        const displacement = dist - target
        const force = ATTRACTION * displacement
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        const fa = forces.get(a)!, fb = forces.get(b)!
        fa.x += fx; fa.y += fy
        fb.x -= fx; fb.y -= fy
      }

      // Apply forces with temperature and damping
      for (const id of ids) {
        const f = forces.get(id)!
        const v = vel.get(id)!
        const p = pos.get(id)!

        v.x = (v.x + f.x) * DAMPING * temp
        v.y = (v.y + f.y) * DAMPING * temp

        // Cap velocity
        const speed = Math.sqrt(v.x * v.x + v.y * v.y)
        if (speed > MAX_FORCE) {
          v.x = (v.x / speed) * MAX_FORCE
          v.y = (v.y / speed) * MAX_FORCE
        }

        p.x += v.x
        p.y += v.y
      }
    }

    // --- Final overlap sweep: nudge any boxes that still collide ---
    for (let pass = 0; pass < 10; pass++) {
      let anyOverlap = false
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = ids[i], b = ids[j]
          const pa = pos.get(a)!, pb = pos.get(b)!
          const overlapX = (NODE_W + PADDING) - Math.abs(pb.x - pa.x)
          const overlapY = (NODE_H + PADDING) - Math.abs(pb.y - pa.y)

          if (overlapX > 0 && overlapY > 0) {
            anyOverlap = true
            // Push apart along the axis of least overlap
            if (overlapX < overlapY) {
              const push = overlapX / 2 + 1
              if (pb.x >= pa.x) { pa.x -= push; pb.x += push }
              else { pa.x += push; pb.x -= push }
            } else {
              const push = overlapY / 2 + 1
              if (pb.y >= pa.y) { pa.y -= push; pb.y += push }
              else { pa.y += push; pb.y -= push }
            }
          }
        }
      }
      if (!anyOverlap) break
    }

    // --- Apply final positions ---
    setNodes((nds) => nds.map(n => {
      const p = pos.get(n.id)
      return p ? { ...n, position: { x: Math.round(p.x), y: Math.round(p.y) } } : n
    }))

    setTimeout(() => {
      try { fitView({ padding: 0.12, duration: 600 }) } catch {}
    }, 50)
  }, [edges, setNodes, fitView])

  return (
    <div 
      style={{ width: '100%', height: '100%' }} 
      className="bg-[#050510]"
      onClick={() => setContextMenu(null)}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDoubleClick={onPaneDoubleClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        onNodeDoubleClick={(_: React.MouseEvent, node: Node) => setActiveModalNode(node)}
        onNodeContextMenu={onNodeContextMenu}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        deleteKeyCode={['Delete', 'Backspace']}
        fitView
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
        <Controls showInteractive={false} className="!bg-[#1e1e2e] !border-[#2e2e3e] !fill-[#f1f5f9]" />
        <MiniMap 
          nodeColor={(n: any) => n.data?.color || '#3F3F46'} 
          maskColor="rgba(5, 5, 16, 0.7)"
          className="!bg-[#0a0a1a] !border-[#1e1e2e]" 
        />
        <Panel position="top-right" className="flex gap-2">
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

      {activeModalNode && (
        <NodeContentModal 
          isOpen={!!activeModalNode} 
          node={activeModalNode} 
          onClose={() => setActiveModalNode(null)} 
        />
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

'use client'

import React, { useCallback, useMemo, useState, useEffect } from 'react'
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
  applyNodeChanges,
  applyEdgeChanges,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import { ThinkNode } from './think-node'
import type { ThinkNode as ThinkNodeData, ThinkEdge as ThinkEdgeData } from '@/lib/services/mind-map-service'
import { openDrawer } from '@/components/layout/slide-out-drawer'

const nodeTypes = {
  think: ThinkNode,
}

interface ThinkCanvasProps {
  boardId: string
  initialNodes: ThinkNodeData[]
  initialEdges: ThinkEdgeData[]
  userId: string
}

export function ThinkCanvas({ boardId, initialNodes, initialEdges, userId }: ThinkCanvasProps) {
  // Map our service nodes to xyflow nodes
  const mapNodes = useCallback((nodes: ThinkNodeData[]): Node[] => {
    return nodes.map((node) => ({
      id: node.id,
      type: 'think',
      position: { x: node.positionX, y: node.positionY },
      data: {
        label: node.label,
        description: node.description,
        color: node.color,
        nodeType: node.nodeType,
      },
      selected: false,
    }))
  }, [])

  // Map our service edges to xyflow edges
  const mapEdges = useCallback((edges: ThinkEdgeData[]): Edge[] => {
    return edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      label: edge.edgeType === 'ai_generated' ? 'AI Link' : undefined,
      animated: edge.edgeType === 'ai_generated',
      style: { stroke: edge.edgeType === 'ai_generated' ? '#6366f1' : '#3F464E' },
    }))
  }, [])

  const [nodes, setNodes, onNodesChange] = useNodesState(mapNodes(initialNodes))
  const [edges, setEdges, onEdgesChange] = useEdgesState(mapEdges(initialEdges))

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

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      persistNodePosition(node.id, node.position.x, node.position.y)
    },
    [persistNodePosition]
  )

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      // In a real app, you'd wire this to a POST /api/mindmap/edges/ route
      // For now, we update local state (Lane 3 covers gateway/service creation)
      setEdges((eds) => addEdge({ ...params, style: { stroke: '#3F464E' } }, eds))
    },
    [setEdges]
  )

  return (
    <div style={{ width: '100%', height: '100%' }} className="bg-[#050510]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        onNodeClick={(_: React.MouseEvent, node: Node) => {
          openDrawer({
            type: 'think_node',
            data: node
          })
        }}
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
            <div className="px-3 py-1.5 rounded-lg bg-[#1e1e2e] border border-[#2e2e3e] text-xs font-medium text-[#94a3b8] shadow-2xl">
              ESC — Clear selection
            </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}

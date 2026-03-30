import { generateId } from '@/lib/utils';
import { getStorageAdapter } from '@/lib/storage-adapter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThinkBoard {
  id: string;
  workspaceId: string;
  name: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ThinkNode {
  id: string;
  boardId: string;
  parentNodeId?: string | null;
  label: string;
  description: string;
  color: string;
  positionX: number;
  positionY: number;
  nodeType: 'root' | 'manual' | 'ai_generated' | 'exported';
  metadata: Record<string, any>;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThinkEdge {
  id: string;
  boardId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: 'manual' | 'ai_generated';
  createdAt: string;
}

// ---------------------------------------------------------------------------
// DB ↔ TS normalization
// ---------------------------------------------------------------------------

function boardFromDB(row: any): ThinkBoard {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    isArchived: row.is_archived ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function boardToDB(board: Partial<ThinkBoard>): Record<string, any> {
  const row: Record<string, any> = {};
  if (board.id !== undefined) row.id = board.id;
  if (board.workspaceId !== undefined) row.workspace_id = board.workspaceId;
  if (board.name !== undefined) row.name = board.name;
  if (board.isArchived !== undefined) row.is_archived = board.isArchived;
  if (board.createdAt !== undefined) row.created_at = board.createdAt;
  if (board.updatedAt !== undefined) row.updated_at = board.updatedAt;
  return row;
}

function nodeFromDB(row: any): ThinkNode {
  return {
    id: row.id,
    boardId: row.board_id,
    parentNodeId: row.parent_node_id,
    label: row.label,
    description: row.description ?? '',
    color: row.color ?? '#3f3f46',
    positionX: Number(row.position_x ?? 0),
    positionY: Number(row.position_y ?? 0),
    nodeType: row.node_type as any,
    metadata: row.metadata ?? {},
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function nodeToDB(node: Partial<ThinkNode>): Record<string, any> {
  const row: Record<string, any> = {};
  if (node.id !== undefined) row.id = node.id;
  if (node.boardId !== undefined) row.board_id = node.boardId;
  if (node.parentNodeId !== undefined) row.parent_node_id = node.parentNodeId;
  if (node.label !== undefined) row.label = node.label;
  if (node.description !== undefined) row.description = node.description;
  if (node.color !== undefined) row.color = node.color;
  if (node.positionX !== undefined) row.position_x = node.positionX;
  if (node.positionY !== undefined) row.position_y = node.positionY;
  if (node.nodeType !== undefined) row.node_type = node.nodeType;
  if (node.metadata !== undefined) row.metadata = node.metadata;
  if (node.createdBy !== undefined) row.created_by = node.createdBy;
  if (node.createdAt !== undefined) row.created_at = node.createdAt;
  if (node.updatedAt !== undefined) row.updated_at = node.updatedAt;
  return row;
}

function edgeFromDB(row: any): ThinkEdge {
  return {
    id: row.id,
    boardId: row.board_id,
    sourceNodeId: row.source_node_id,
    targetNodeId: row.target_node_id,
    edgeType: row.edge_type as any,
    createdAt: row.created_at,
  };
}

function edgeToDB(edge: Partial<ThinkEdge>): Record<string, any> {
  const row: Record<string, any> = {};
  if (edge.id !== undefined) row.id = edge.id;
  if (edge.boardId !== undefined) row.board_id = edge.boardId;
  if (edge.sourceNodeId !== undefined) row.source_node_id = edge.sourceNodeId;
  if (edge.targetNodeId !== undefined) row.target_node_id = edge.targetNodeId;
  if (edge.edgeType !== undefined) row.edge_type = edge.edgeType;
  if (edge.createdAt !== undefined) row.created_at = edge.createdAt;
  return row;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getWorkspaceId(userId: string): Promise<string | null> {
  // Mira uses single-tenant local dev paths, so userId serves as the workspace boundary.
  return userId;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function getBoards(userId: string): Promise<ThinkBoard[]> {
  const adapter = getStorageAdapter();
  const workspaceId = await getWorkspaceId(userId);
  if (!workspaceId) return [];
  
  const rows = await adapter.query<any>('think_boards', { workspace_id: workspaceId });
  return rows.map(boardFromDB);
}

export async function createBoard(userId: string, name: string): Promise<ThinkBoard> {
  const adapter = getStorageAdapter();
  const workspaceId = await getWorkspaceId(userId);
  
  if (!workspaceId) {
    throw new Error(`User ${userId} does not belong to any workspace. Board creation failed.`);
  }

  const now = new Date().toISOString();
  const board: ThinkBoard = {
    id: generateId(),
    workspaceId,
    name,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  const row = boardToDB(board);
  const saved = await adapter.saveItem<any>('think_boards', row);
  return boardFromDB(saved);
}

export async function getBoardGraph(boardId: string): Promise<{ nodes: ThinkNode[]; edges: ThinkEdge[] }> {
  const adapter = getStorageAdapter();
  
  const [nodes, edges] = await Promise.all([
    adapter.query<any>('think_nodes', { board_id: boardId }),
    adapter.query<any>('think_edges', { board_id: boardId }),
  ]);

  return {
    nodes: nodes.map(nodeFromDB),
    edges: edges.map(edgeFromDB),
  };
}

export async function createNode(userId: string, boardId: string, node: Partial<ThinkNode>): Promise<ThinkNode> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();

  const newNode: ThinkNode = {
    id: generateId(),
    boardId,
    parentNodeId: node.parentNodeId ?? null,
    label: node.label ?? 'New Node',
    description: node.description ?? '',
    color: node.color ?? '#3f3f46',
    positionX: node.positionX ?? 0,
    positionY: node.positionY ?? 0,
    nodeType: node.nodeType ?? 'manual',
    metadata: node.metadata ?? {},
    // Pass null to bypass auth.users FK constraint strictly for local dev
    createdBy: null,
    createdAt: now,
    updatedAt: now,
  };

  const row = nodeToDB(newNode);
  const saved = await adapter.saveItem<any>('think_nodes', row);
  return nodeFromDB(saved);
}

export async function updateNodePosition(nodeId: string, x: number, y: number): Promise<boolean> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  
  const updated = await adapter.updateItem<any>('think_nodes', nodeId, {
    position_x: x,
    position_y: y,
    updated_at: now
  });

  return !!updated;
}

export async function updateNode(nodeId: string, updates: Partial<ThinkNode>): Promise<ThinkNode | null> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  
  const dbUpdates = nodeToDB({ ...updates, updatedAt: now });
  const updated = await adapter.updateItem<any>('think_nodes', nodeId, dbUpdates);
  return updated ? nodeFromDB(updated) : null;
}

export async function createEdge(boardId: string, sourceNodeId: string, targetNodeId: string): Promise<ThinkEdge> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();

  const edge: ThinkEdge = {
    id: generateId(),
    boardId,
    sourceNodeId,
    targetNodeId,
    edgeType: 'manual',
    createdAt: now,
  };

  const row = edgeToDB(edge);
  const saved = await adapter.saveItem<any>('think_edges', row);
  return edgeFromDB(saved);
}

export async function deleteEdge(edgeId: string): Promise<boolean> {
  const adapter = getStorageAdapter();
  await adapter.deleteItem('think_edges', edgeId);
  return true;
}

export async function deleteNode(nodeId: string): Promise<boolean> {
  const adapter = getStorageAdapter();
  // Note: Database cascade should handle edges if configured.
  // We'll just delete the node and assume DB handles consistency or caller handles it.
  await adapter.deleteItem('think_nodes', nodeId);
  return true;
}

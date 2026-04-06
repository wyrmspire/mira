import { generateId } from '@/lib/utils';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { ThinkBoard, ThinkNode, ThinkEdge, BoardPurpose, LayoutMode } from '@/types/mind-map';
import { MapSummary } from '@/types/synthesis';

// ---------------------------------------------------------------------------
// DB ↔ TS normalization
// ---------------------------------------------------------------------------

function boardFromDB(row: any): ThinkBoard {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    purpose: row.purpose || 'general',
    layoutMode: row.layout_mode || 'radial',
    linkedEntityId: row.linked_entity_id,
    linkedEntityType: row.linked_entity_type,
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
  if (board.purpose !== undefined) row.purpose = board.purpose;
  if (board.layoutMode !== undefined) row.layout_mode = board.layoutMode;
  if (board.linkedEntityId !== undefined) row.linked_entity_id = board.linkedEntityId;
  if (board.linkedEntityType !== undefined) row.linked_entity_type = board.linkedEntityType;
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
    content: row.content ?? '',
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
  if (node.content !== undefined) row.content = node.content;
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

/**
 * Fetches a lightweight summary of all active boards for the user.
 * Used to inject into the GPT state packet.
 */
export async function getBoardSummaries(userId: string): Promise<MapSummary[]> {
  const boards = await getBoards(userId);
  const activeBoards = boards.filter(b => !b.isArchived);
  
  const summaries = await Promise.all(activeBoards.map(async (board) => {
    // Instead of getBoardGraph, we query counts only if possible, 
    // but the adapter is thin, so we just query and count.
    const adapter = getStorageAdapter();
    const [nodes, edges] = await Promise.all([
      adapter.query<any>('think_nodes', { board_id: board.id }),
      adapter.query<any>('think_edges', { board_id: board.id }),
    ]);

    return {
      id: board.id,
      name: board.name,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      purpose: board.purpose || 'general',
      layoutMode: board.layoutMode || 'radial',
      linkedEntityType: board.linkedEntityType || null,
    };
  }));

  return summaries;
}

export async function createBoard(
  userId: string, 
  name: string, 
  purpose: ThinkBoard['purpose'] = 'general',
  linkedEntityId: string | null = null,
  linkedEntityType: ThinkBoard['linkedEntityType'] = null
): Promise<ThinkBoard> {
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
    purpose,
    layoutMode: 'radial',
    linkedEntityId,
    linkedEntityType,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  const row = boardToDB(board);
  const saved = await adapter.saveItem<any>('think_boards', row);
  const finalBoard = boardFromDB(saved);

  // Apply template if purpose is not general
  if (purpose !== 'general') {
    await applyBoardTemplate(userId, finalBoard.id, name, purpose);
  }

  return finalBoard;
}

export async function updateBoard(boardId: string, updates: Partial<ThinkBoard>): Promise<ThinkBoard | null> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  
  const dbUpdates = boardToDB({ ...updates, updatedAt: now });
  const updated = await adapter.updateItem<any>('think_boards', boardId, dbUpdates);
  return updated ? boardFromDB(updated) : null;
}

export async function deleteBoard(boardId: string): Promise<boolean> {
  const adapter = getStorageAdapter();
  
  // Lock 6: Cascade delete removes edges -> nodes -> board
  // 1. Delete edges
  const edges = await adapter.query<any>('think_edges', { board_id: boardId });
  for (const edge of edges) {
    await adapter.deleteItem('think_edges', edge.id);
  }
  
  // 2. Delete nodes
  const nodes = await adapter.query<any>('think_nodes', { board_id: boardId });
  for (const node of nodes) {
    // Also delete node versions if they exist (best effort)
    try {
      const versions = await adapter.query<any>('think_node_versions', { node_id: node.id });
      for (const version of versions) {
        await adapter.deleteItem('think_node_versions', version.id);
      }
    } catch (e) {}
    await adapter.deleteItem('think_nodes', node.id);
  }
  
  // 3. Delete board
  await adapter.deleteItem('think_boards', boardId);
  return true;
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
    content: node.content ?? '',
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

// ---------------------------------------------------------------------------
// Board Templates (Sprint 24)
// ---------------------------------------------------------------------------

/**
 * Returns starter node labels for a given board purpose.
 */
export function getBoardTemplate(purpose: BoardPurpose): { children: string[] } | null {
  switch (purpose) {
    case 'idea_planning':
      return { children: ['Market', 'Tech', 'UX', 'Risks'] };
    case 'curriculum_review':
      return { children: ['Foundations', 'Core Concepts', 'Advanced Applied', 'Case Studies'] };
    case 'lesson_plan':
      return { children: ['Primer', 'Practice', 'Checkpoint', 'Reflection'] };
    case 'research_tracking':
      return { children: ['Pending', 'In Progress', 'Complete'] };
    case 'strategy':
      return { children: ['Domain A', 'Domain B', 'Milestones', 'Risk Map'] };
    default:
      return null;
  }
}

/**
 * Auto-populates a board with starter nodes based on its purpose.
 * Nodes are arranged in a simple radial layout.
 */
async function applyBoardTemplate(userId: string, boardId: string, centerLabel: string, purpose: BoardPurpose) {
  const template = getBoardTemplate(purpose);
  if (!template) return;

  // Create center/root node
  const rootNode = await createNode(userId, boardId, {
    label: centerLabel,
    nodeType: 'root',
    positionX: 0,
    positionY: 0
  });

  const children = template.children;
  const radius = 250;

  for (let i = 0; i < children.length; i++) {
    const angle = (i / children.length) * 2 * Math.PI;
    const x = Math.round(radius * Math.cos(angle));
    const y = Math.round(radius * Math.sin(angle));

    const childNode = await createNode(userId, boardId, {
      label: children[i],
      nodeType: 'manual',
      positionX: x,
      positionY: y
    });

    // Connect child to root
    await createEdge(boardId, rootNode.id, childNode.id);
  }
}

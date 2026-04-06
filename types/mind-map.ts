// types/mind-map.ts
// Sprint 17+ — Think Boards: spatial planning surfaces
// Sprint 24 — Multi-Board Intelligence: purpose types, layout modes, entity linking

/**
 * Board purpose determines template auto-creation on board creation.
 * Purpose ≠ general triggers starter nodes from getBoardTemplate().
 */
export type BoardPurpose =
  | 'general'             // Blank canvas — no template
  | 'idea_planning'       // Center → Market, Tech, UX, Risks
  | 'curriculum_review'   // Center → subtopic nodes
  | 'lesson_plan'         // Center → Primer, Practice, Checkpoint, Reflection
  | 'research_tracking'   // Center → Pending, In Progress, Complete
  | 'strategy';           // Center → Domain nodes → Milestones

/**
 * How the board is visually laid out.
 * Sprint 24: persistence-only — all modes render as radial (Lock 5).
 */
export type LayoutMode = 'radial' | 'concept' | 'flow' | 'timeline';

export interface ThinkBoard {
  id: string;
  workspaceId: string;
  name: string;
  /** Board purpose — drives template auto-creation. DB default: 'general'. */
  purpose?: BoardPurpose;
  /** Layout mode — persistence-only in Sprint 24 (Lock 5). DB default: 'radial'. */
  layoutMode?: LayoutMode;
  /** UUID of the linked entity (goal, outline, experience). */
  linkedEntityId?: string | null;
  /** Type of the linked entity: 'goal' | 'outline' | 'experience'. */
  linkedEntityType?: string | null;
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
  content: string;
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

import { Goal, GoalRow, GoalStatus } from '@/types/goal';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { generateId } from '@/lib/utils';
import { canTransitionGoal, getNextGoalState, GoalTransitionAction } from '@/lib/state-machine';

// ---------------------------------------------------------------------------
// DB ↔ TS normalization
// ---------------------------------------------------------------------------

function fromDB(row: any): Goal {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? '',
    status: row.status as GoalStatus,
    domains: row.domains ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDB(goal: Partial<Goal>): Record<string, any> {
  const row: Record<string, any> = {};
  if (goal.id !== undefined) row.id = goal.id;
  if (goal.userId !== undefined) row.user_id = goal.userId;
  if (goal.title !== undefined) row.title = goal.title;
  if (goal.description !== undefined) row.description = goal.description;
  if (goal.status !== undefined) row.status = goal.status;
  if (goal.domains !== undefined) row.domains = goal.domains;
  if (goal.createdAt !== undefined) row.created_at = goal.createdAt;
  if (goal.updatedAt !== undefined) row.updated_at = goal.updatedAt;
  return row;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createGoal(
  data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Goal> {
  // Validate
  try {
    const { validateGoal } = await import('@/lib/validators/goal-validator');
    const validation = validateGoal(data);
    if (!validation.valid) {
      throw new Error(`Invalid goal: ${validation.errors.join(', ')}`);
    }
  } catch (importErr: any) {
    if (importErr.message?.startsWith('Invalid goal')) {
      throw importErr;
    }
  }

  const adapter = getStorageAdapter();
  const now = new Date().toISOString();

  const goal: Goal = {
    ...data,
    id: generateId(),
    status: data.status ?? 'intake',
    description: data.description ?? '',
    domains: data.domains ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const row = toDB(goal);
  const saved = await adapter.saveItem<GoalRow>('goals', row as GoalRow);
  return fromDB(saved);
}

export async function getGoal(id: string): Promise<Goal | null> {
  const adapter = getStorageAdapter();
  const rows = await adapter.query<GoalRow>('goals', { id });
  return rows.length > 0 ? fromDB(rows[0]) : null;
}

export async function getGoalsForUser(userId: string): Promise<Goal[]> {
  const adapter = getStorageAdapter();
  const rows = await adapter.query<GoalRow>('goals', { user_id: userId });
  return rows.map(fromDB);
}

export async function getActiveGoal(userId: string): Promise<Goal | null> {
  const adapter = getStorageAdapter();
  const rows = await adapter.query<GoalRow>('goals', { user_id: userId, status: 'active' });
  return rows.length > 0 ? fromDB(rows[0]) : null;
}

export async function updateGoal(
  id: string,
  updates: Partial<Omit<Goal, 'id' | 'createdAt'>>
): Promise<Goal | null> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  
  // If we're setting status to 'active', enforce single active goal per user
  if (updates.status === 'active') {
    const existing = await getGoal(id);
    if (existing) {
      const activeCurrent = await getActiveGoal(existing.userId);
      if (activeCurrent && activeCurrent.id !== id) {
        // Pause the currently active goal
        await adapter.updateItem<any>('goals', activeCurrent.id, {
          status: 'paused',
          updated_at: now
        });
      }
    }
  }

  const dbUpdates = toDB({ ...updates, updatedAt: now });
  const updated = await adapter.updateItem<any>('goals', id, dbUpdates);
  return updated ? fromDB(updated) : null;
}

// ---------------------------------------------------------------------------
// Business Logic Functions
// ---------------------------------------------------------------------------

export async function transitionGoalStatus(
  id: string,
  action: GoalTransitionAction
): Promise<Goal | null> {
  const goal = await getGoal(id);
  if (!goal) return null;

  if (!canTransitionGoal(goal.status, action)) {
    throw new Error(`Cannot transition goal from ${goal.status} via action ${action}`);
  }

  const nextState = getNextGoalState(goal.status, action);
  if (!nextState) return null;

  return updateGoal(id, { status: nextState });
}



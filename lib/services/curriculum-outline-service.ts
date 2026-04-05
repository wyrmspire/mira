import { CurriculumOutline, CurriculumOutlineRow, CurriculumSubtopic } from '@/types/curriculum';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { generateId } from '@/lib/utils';
import { CurriculumStatus } from '@/lib/constants';

// ---------------------------------------------------------------------------
// DB ↔ TS normalization
// ---------------------------------------------------------------------------

/**
 * Map a raw DB row (snake_case) → typed CurriculumOutline (camelCase).
 */
function fromDB(row: any): CurriculumOutline {
  return {
    id: row.id,
    userId: row.user_id,
    topic: row.topic,
    domain: row.domain ?? null,
    discoverySignals: row.discovery_signals ?? {},
    subtopics: row.subtopics ?? [],
    existingUnitIds: row.existing_unit_ids ?? [],
    researchNeeded: row.research_needed ?? [],
    pedagogicalIntent: row.pedagogical_intent ?? 'build_understanding',
    estimatedExperienceCount: row.estimated_experience_count ?? null,
    status: row.status as CurriculumStatus,
    goalId: row.goal_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map a CurriculumOutline (camelCase) → DB row (snake_case).
 * Only includes keys that are explicitly defined.
 */
function toDB(outline: Partial<CurriculumOutline>): Record<string, any> {
  const row: Record<string, any> = {};
  if (outline.id !== undefined) row.id = outline.id;
  if (outline.userId !== undefined) row.user_id = outline.userId;
  if (outline.topic !== undefined) row.topic = outline.topic;
  if (outline.domain !== undefined) row.domain = outline.domain;
  if (outline.discoverySignals !== undefined) row.discovery_signals = outline.discoverySignals;
  if (outline.subtopics !== undefined) row.subtopics = outline.subtopics;
  if (outline.existingUnitIds !== undefined) row.existing_unit_ids = outline.existingUnitIds;
  if (outline.researchNeeded !== undefined) row.research_needed = outline.researchNeeded;
  if (outline.pedagogicalIntent !== undefined) row.pedagogical_intent = outline.pedagogicalIntent;
  if (outline.estimatedExperienceCount !== undefined) row.estimated_experience_count = outline.estimatedExperienceCount;
  if (outline.status !== undefined) row.status = outline.status;
  if (outline.goalId !== undefined) row.goal_id = outline.goalId;
  if (outline.createdAt !== undefined) row.created_at = outline.createdAt;
  if (outline.updatedAt !== undefined) row.updated_at = outline.updatedAt;
  return row;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new curriculum outline.
 * Validates via curriculum-validator (lazy-imported; safe before Lane 1 ships it).
 */
export async function createCurriculumOutline(
  data: Omit<CurriculumOutline, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CurriculumOutline> {
  // Lazy-import validator — compiles cleanly even when Lane 1's file doesn't exist yet
  try {
    const { validateCurriculumOutline } = await import('@/lib/validators/curriculum-validator');
    const validation = validateCurriculumOutline(data);
    if (!validation.valid) {
      throw new Error(`Invalid curriculum outline: ${validation.error}`);
    }
  } catch (importErr: any) {
    if (importErr.message?.startsWith('Invalid curriculum outline')) {
      throw importErr;
    }
    // Validator file not yet available — allow through in development
    console.warn('[curriculum-outline-service] curriculum-validator not found, skipping validation');
  }

  const adapter = getStorageAdapter();
  const now = new Date().toISOString();

  const outline: CurriculumOutline = {
    ...data,
    id: generateId(),
    status: data.status ?? 'planning',
    discoverySignals: data.discoverySignals ?? {},
    existingUnitIds: data.existingUnitIds ?? [],
    researchNeeded: data.researchNeeded ?? [],
    subtopics: data.subtopics ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const row = toDB(outline);
  const saved = await adapter.saveItem<CurriculumOutlineRow>('curriculum_outlines', row as CurriculumOutlineRow);
  return fromDB(saved);
}

/**
 * List all curriculum outlines for a goal.
 */
export async function getOutlinesForGoal(goalId: string): Promise<CurriculumOutline[]> {
  const adapter = getStorageAdapter();
  const rows = await adapter.query<CurriculumOutlineRow>('curriculum_outlines', { goal_id: goalId });
  return rows.map(fromDB);
}

/**
 * Fetch a single curriculum outline by ID.
 */
export async function getCurriculumOutline(id: string): Promise<CurriculumOutline | null> {
  const adapter = getStorageAdapter();
  const rows = await adapter.query<CurriculumOutlineRow>('curriculum_outlines', { id });
  return rows.length > 0 ? fromDB(rows[0]) : null;
}

/**
 * List all curriculum outlines for a user.
 */
export async function getCurriculumOutlinesForUser(userId: string): Promise<CurriculumOutline[]> {
  const adapter = getStorageAdapter();
  const rows = await adapter.query<CurriculumOutlineRow>('curriculum_outlines', { user_id: userId });
  return rows.map(fromDB);
}

/**
 * Get outlines in active or planning status (for GPT state endpoint).
 */
export async function getActiveCurriculumOutlines(userId: string): Promise<CurriculumOutline[]> {
  const all = await getCurriculumOutlinesForUser(userId);
  return all.filter(o => o.status === 'active' || o.status === 'planning');
}

/**
 * Get recently completed outlines, sorted newest first.
 */
export async function getRecentlyCompletedOutlines(
  userId: string,
  limit = 5
): Promise<CurriculumOutline[]> {
  const all = await getCurriculumOutlinesForUser(userId);
  return all
    .filter(o => o.status === 'completed')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}

/**
 * Find an active or planning outline by topic (case-insensitive partial match).
 */
export async function findActiveOutlineByTopic(
  userId: string,
  topic: string
): Promise<CurriculumOutline | null> {
  const active = await getActiveCurriculumOutlines(userId);
  const normalizedTopic = topic.toLowerCase().trim();
  
  // Try exact match first
  const exact = active.find(o => o.topic.toLowerCase().trim() === normalizedTopic);
  if (exact) return exact;
  
  // Fall back to partial match
  return active.find(o => o.topic.toLowerCase().includes(normalizedTopic)) || null;
}

/**
 * Partial update of a curriculum outline (status, subtopics, etc.).
 */
export async function updateCurriculumOutline(
  id: string,
  updates: Partial<Omit<CurriculumOutline, 'id' | 'createdAt'>>
): Promise<CurriculumOutline | null> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  const dbUpdates = toDB({ ...updates, updatedAt: now });
  const updated = await adapter.updateItem<any>('curriculum_outlines', id, dbUpdates);
  return updated ? fromDB(updated) : null;
}

/**
 * Fetch an outline plus its linked experience instances (via subtopic experienceId fields).
 */
export async function getOutlineWithExperiences(
  id: string
): Promise<(CurriculumOutline & { experiences: any[] }) | null> {
  const outline = await getCurriculumOutline(id);
  if (!outline) return null;

  const experienceIds = outline.subtopics
    .map(s => s.experienceId)
    .filter((eid): eid is string => !!eid);

  if (experienceIds.length === 0) {
    return { ...outline, experiences: [] };
  }

  const adapter = getStorageAdapter();
  const experiences: any[] = [];
  for (const eid of experienceIds) {
    const rows = await adapter.query<any>('experience_instances', { id: eid });
    if (rows.length > 0) experiences.push(rows[0]);
  }

  return { ...outline, experiences };
}

// ---------------------------------------------------------------------------
// W4 — Outline-experience linking
// ---------------------------------------------------------------------------

/**
 * Link an experience to a subtopic within a curriculum outline.
 * Sets the subtopic's experienceId and advances status to 'in_progress' if still pending.
 *
 * @param experienceId  UUID of the experience instance
 * @param outlineId     UUID of the curriculum outline
 * @param subtopicIndex 0-based index into outline.subtopics[]
 */
export async function linkExperienceToOutline(
  experienceId: string,
  outlineId: string,
  subtopicIndex: number
): Promise<CurriculumOutline | null> {
  const outline = await getCurriculumOutline(outlineId);
  if (!outline) {
    console.warn(`[curriculum-outline-service] linkExperienceToOutline: outline ${outlineId} not found`);
    return null;
  }

  if (subtopicIndex < 0 || subtopicIndex >= outline.subtopics.length) {
    console.warn(
      `[curriculum-outline-service] linkExperienceToOutline: subtopicIndex ${subtopicIndex} out of range`
    );
    return null;
  }

  const updatedSubtopics: CurriculumSubtopic[] = outline.subtopics.map((st, idx) => {
    if (idx !== subtopicIndex) return st;
    return {
      ...st,
      experienceId: experienceId,
      status: st.status === 'pending' ? 'in_progress' : st.status,
    };
  });

  return updateCurriculumOutline(outlineId, { subtopics: updatedSubtopics });
}

/**
 * Mark a subtopic as completed and auto-advance outline status if all subtopics are done.
 */
export async function markSubtopicCompleted(
  outlineId: string,
  subtopicIndex: number
): Promise<CurriculumOutline | null> {
  const outline = await getCurriculumOutline(outlineId);
  if (!outline) return null;
  if (subtopicIndex < 0 || subtopicIndex >= outline.subtopics.length) return null;

  const updatedSubtopics: CurriculumSubtopic[] = outline.subtopics.map((st, idx) =>
    idx === subtopicIndex ? { ...st, status: 'completed' } : st
  );

  const allDone = updatedSubtopics.every(st => st.status === 'completed');
  return updateCurriculumOutline(outlineId, {
    subtopics: updatedSubtopics,
    ...(allDone ? { status: 'completed' as CurriculumStatus } : {}),
  });
}

// ---------------------------------------------------------------------------
// GPT state summary helper
// ---------------------------------------------------------------------------

/**
 * Returns a compact curriculum summary for inclusion in the GPT state packet.
 */
export async function getCurriculumSummaryForGPT(userId: string): Promise<{
  active_outlines: Array<{
    id: string;
    topic: string;
    status: CurriculumStatus;
    subtopic_count: number;
    completed_subtopics: number;
  }>;
  recent_completions: Array<{ id: string; topic: string; updatedAt: string }>;
}> {
  try {
    const [active, completed] = await Promise.all([
      getActiveCurriculumOutlines(userId),
      getRecentlyCompletedOutlines(userId, 3),
    ]);

    return {
      active_outlines: active.map(o => ({
        id: o.id,
        topic: o.topic,
        status: o.status,
        subtopic_count: o.subtopics.length,
        completed_subtopics: o.subtopics.filter(s => s.status === 'completed').length,
      })),
      recent_completions: completed.map(o => ({
        id: o.id,
        topic: o.topic,
        updatedAt: o.updatedAt,
      })),
    };
  } catch (error) {
    console.error('[curriculum-outline-service] getCurriculumSummaryForGPT failed:', error);
    return { active_outlines: [], recent_completions: [] };
  }
}

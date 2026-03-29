import { SkillDomain, SkillDomainRow } from '@/types/skill';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { generateId } from '@/lib/utils';
import { SkillMasteryLevel } from '@/lib/constants';

// ---------------------------------------------------------------------------
// DB ↔ TS normalization
// ---------------------------------------------------------------------------

/**
 * Map a raw DB row (snake_case) → typed SkillDomain (camelCase).
 */
function fromDB(row: any): SkillDomain {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    name: row.name,
    description: row.description ?? '',
    masteryLevel: row.mastery_level as SkillMasteryLevel,
    linkedUnitIds: row.linked_unit_ids ?? [],
    linkedExperienceIds: row.linked_experience_ids ?? [],
    evidenceCount: row.evidence_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map a SkillDomain (camelCase) → DB row (snake_case).
 */
function toDB(domain: Partial<SkillDomain>): Record<string, any> {
  const row: Record<string, any> = {};
  if (domain.id !== undefined) row.id = domain.id;
  if (domain.userId !== undefined) row.user_id = domain.userId;
  if (domain.goalId !== undefined) row.goal_id = domain.goalId;
  if (domain.name !== undefined) row.name = domain.name;
  if (domain.description !== undefined) row.description = domain.description;
  if (domain.masteryLevel !== undefined) row.mastery_level = domain.masteryLevel;
  if (domain.linkedUnitIds !== undefined) row.linked_unit_ids = domain.linkedUnitIds;
  if (domain.linkedExperienceIds !== undefined) row.linked_experience_ids = domain.linkedExperienceIds;
  if (domain.evidenceCount !== undefined) row.evidence_count = domain.evidenceCount;
  if (domain.createdAt !== undefined) row.created_at = domain.createdAt;
  if (domain.updatedAt !== undefined) row.updated_at = domain.updatedAt;
  return row;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new skill domain.
 */
export async function createSkillDomain(
  data: Omit<SkillDomain, 'id' | 'createdAt' | 'updatedAt' | 'masteryLevel' | 'evidenceCount'>
): Promise<SkillDomain> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();

  const domain: SkillDomain = {
    ...data,
    id: generateId(),
    masteryLevel: 'undiscovered',
    evidenceCount: 0,
    linkedUnitIds: data.linkedUnitIds ?? [],
    linkedExperienceIds: data.linkedExperienceIds ?? [],
    createdAt: now,
    updatedAt: now,
  } as SkillDomain;

  const row = toDB(domain);
  const saved = await adapter.saveItem<SkillDomainRow>('skill_domains', row as SkillDomainRow);
  return fromDB(saved);
}

/**
 * Fetch a single skill domain by ID.
 */
export async function getSkillDomain(id: string): Promise<SkillDomain | null> {
  const adapter = getStorageAdapter();
  const rows = await adapter.query<SkillDomainRow>('skill_domains', { id });
  return rows.length > 0 ? fromDB(rows[0]) : null;
}

/**
 * List all skill domains for a specific goal.
 */
export async function getSkillDomainsForGoal(goalId: string): Promise<SkillDomain[]> {
  const adapter = getStorageAdapter();
  const rows = await adapter.query<SkillDomainRow>('skill_domains', { goal_id: goalId });
  return rows.map(fromDB);
}

/**
 * List all skill domains for a user.
 */
export async function getSkillDomainsForUser(userId: string): Promise<SkillDomain[]> {
  const adapter = getStorageAdapter();
  const rows = await adapter.query<SkillDomainRow>('skill_domains', { user_id: userId });
  return rows.map(fromDB);
}

/**
 * Partial update of a skill domain.
 */
export async function updateSkillDomain(
  id: string,
  updates: Partial<Omit<SkillDomain, 'id' | 'createdAt'>>
): Promise<SkillDomain | null> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  const dbUpdates = toDB({ ...updates, updatedAt: now });
  const updated = await adapter.updateItem<any>('skill_domains', id, dbUpdates);
  return updated ? fromDB(updated) : null;
}

/**
 * Link a knowledge unit to a skill domain.
 */
export async function linkKnowledgeUnit(domainId: string, unitId: string): Promise<SkillDomain | null> {
  const domain = await getSkillDomain(domainId);
  if (!domain) return null;

  const linkedUnitIds = Array.from(new Set([...domain.linkedUnitIds, unitId]));
  return updateSkillDomain(domainId, { linkedUnitIds });
}

/**
 * Link an experience instance to a skill domain.
 */
export async function linkExperience(domainId: string, instanceId: string): Promise<SkillDomain | null> {
  const domain = await getSkillDomain(domainId);
  if (!domain) return null;

  const linkedExperienceIds = Array.from(new Set([...domain.linkedExperienceIds, instanceId]));
  return updateSkillDomain(domainId, { linkedExperienceIds });
}

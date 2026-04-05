import { KnowledgeUnit, KnowledgeProgress, MasteryStatus } from '@/types/knowledge';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { generateId } from '@/lib/utils';
import { runFlowSafe } from '@/lib/ai/safe-flow';
// Dynamic import used in runKnowledgeEnrichment to avoid circular dependency

/**
 * Normalize a DB row (snake_case from knowledge_units) to the TS KnowledgeUnit shape (camelCase).
 */
function fromDB(row: any): KnowledgeUnit {
  return {
    id: row.id,
    user_id: row.user_id,
    topic: row.topic,
    domain: row.domain,
    unit_type: row.unit_type,
    title: row.title,
    thesis: row.thesis,
    content: row.content,
    key_ideas: row.key_ideas || [],
    common_mistake: row.common_mistake,
    action_prompt: row.action_prompt,
    retrieval_questions: row.retrieval_questions || [],
    citations: row.citations || [],
    linked_experience_ids: row.linked_experience_ids || [],
    source_experience_id: row.source_experience_id,
    subtopic_seeds: row.subtopic_seeds || [],
    mastery_status: row.mastery_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Normalize a TS KnowledgeUnit (camelCase) to DB row shape (snake_case).
 */
function toDB(unit: Partial<KnowledgeUnit>): Record<string, any> {
  const row: Record<string, any> = {};
  if (unit.id) row.id = unit.id;
  if (unit.user_id) row.user_id = unit.user_id;
  if (unit.topic) row.topic = unit.topic;
  if (unit.domain) row.domain = unit.domain;
  if (unit.unit_type) row.unit_type = unit.unit_type;
  if (unit.title) row.title = unit.title;
  if (unit.thesis) row.thesis = unit.thesis;
  if (unit.content) row.content = unit.content;
  if (unit.key_ideas) row.key_ideas = unit.key_ideas;
  if (unit.common_mistake !== undefined) row.common_mistake = unit.common_mistake;
  if (unit.action_prompt !== undefined) row.action_prompt = unit.action_prompt;
  if (unit.retrieval_questions) row.retrieval_questions = unit.retrieval_questions;
  if (unit.citations) row.citations = unit.citations;
  if (unit.linked_experience_ids) row.linked_experience_ids = unit.linked_experience_ids;
  if (unit.source_experience_id !== undefined) row.source_experience_id = unit.source_experience_id;
  if (unit.subtopic_seeds) row.subtopic_seeds = unit.subtopic_seeds;
  if (unit.mastery_status) row.mastery_status = unit.mastery_status;
  if (unit.created_at) row.created_at = unit.created_at;
  if (unit.updated_at) row.updated_at = unit.updated_at;
  return row;
}

function progressFromDB(row: any): KnowledgeProgress {
  return {
    id: row.id,
    user_id: row.user_id,
    unit_id: row.unit_id,
    mastery_status: row.mastery_status,
    last_studied_at: row.last_studied_at,
    created_at: row.created_at,
  };
}

export async function getKnowledgeUnits(userId: string): Promise<KnowledgeUnit[]> {
  const adapter = getStorageAdapter();
  const raw = await adapter.query<any>('knowledge_units', { user_id: userId });
  return raw.map(fromDB);
}

export async function getKnowledgeUnitsByDomain(userId: string, domain: string): Promise<KnowledgeUnit[]> {
  const adapter = getStorageAdapter();
  const raw = await adapter.query<any>('knowledge_units', { user_id: userId, domain });
  return raw.map(fromDB);
}

export async function getKnowledgeUnitById(id: string): Promise<KnowledgeUnit | null> {
  const adapter = getStorageAdapter();
  const raw = await adapter.query<any>('knowledge_units', { id });
  return raw.length > 0 ? fromDB(raw[0]) : null;
}

export async function getKnowledgeUnitsByIds(ids: string[]): Promise<KnowledgeUnit[]> {
  if (!ids || ids.length === 0) return [];
  const adapter = getStorageAdapter();
  
  // Parallel fetch to avoid N+1 sequential latency
  const promises = ids.map(id => adapter.query<any>('knowledge_units', { id }));
  const results = await Promise.all(promises);
  
  return results
    .filter(rows => rows.length > 0)
    .map(rows => fromDB(rows[0]));
}

export async function createKnowledgeUnit(unit: any): Promise<KnowledgeUnit> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  const data = {
    ...unit,
    id: unit.id || generateId(),
    created_at: unit.created_at || now,
    updated_at: unit.updated_at || now,
  };
  const row = toDB(data);
  const saved = await adapter.saveItem<any>('knowledge_units', row);
  return fromDB(saved);
}

export async function createKnowledgeUnits(units: any[]): Promise<KnowledgeUnit[]> {
  const created: KnowledgeUnit[] = [];
  for (const unit of units) {
    created.push(await createKnowledgeUnit(unit));
  }
  return created;
}

export async function recordKnowledgeStudy(userId: string, unitId: string): Promise<void> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  
  // 1. Check existing progress
  const existingProgress = await adapter.query<any>('knowledge_progress', { 
    user_id: userId, 
    unit_id: unitId 
  });

  if (existingProgress.length > 0) {
    // Already has progress, just update last_studied_at
    await adapter.updateItem<any>('knowledge_progress', existingProgress[0].id, {
      last_studied_at: now
    });
  } else {
    // New study session - mark as 'read' by default
    await adapter.saveItem<any>('knowledge_progress', {
      id: generateId(),
      user_id: userId,
      unit_id: unitId,
      mastery_status: 'read',
      last_studied_at: now,
      created_at: now
    });
    
    // Also update the unit's mastery status to 'read'
    await adapter.updateItem<any>('knowledge_units', unitId, {
      mastery_status: 'read',
      updated_at: now
    });
  }
}

export async function updateMasteryStatus(userId: string, unitId: string, status: MasteryStatus): Promise<void> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  
  // 1. Update the unit itself
  await adapter.updateItem<any>('knowledge_units', unitId, { 
    mastery_status: status,
    updated_at: now
  });

  // 2. Upsert progress record
  const existingProgress = await adapter.query<any>('knowledge_progress', { 
    user_id: userId, 
    unit_id: unitId 
  });

  if (existingProgress.length > 0) {
    await adapter.updateItem<any>('knowledge_progress', existingProgress[0].id, {
      mastery_status: status,
      last_studied_at: now
    });
  } else {
    await adapter.saveItem<any>('knowledge_progress', {
      id: generateId(),
      user_id: userId,
      unit_id: unitId,
      mastery_status: status,
      last_studied_at: now,
      created_at: now
    });
  }
}

export async function getKnowledgeProgress(userId: string): Promise<KnowledgeProgress[]> {
  const adapter = getStorageAdapter();
  const raw = await adapter.query<any>('knowledge_progress', { user_id: userId });
  return raw.map(progressFromDB);
}

export async function getKnowledgeDomains(userId: string): Promise<{ domain: string; count: number; readCount: number }[]> {
  const units = await getKnowledgeUnits(userId);
  const domainMap = new Map<string, { count: number; readCount: number }>();

  for (const unit of units) {
    const stats = domainMap.get(unit.domain) || { count: 0, readCount: 0 };
    stats.count++;
    if (unit.mastery_status !== 'unseen') {
      stats.readCount++;
    }
    domainMap.set(unit.domain, stats);
  }

  return Array.from(domainMap.entries()).map(([domain, stats]) => ({
    domain,
    ...stats
  }));
}

export async function getKnowledgeSummaryForGPT(userId: string): Promise<{
  domains: Record<string, number>;
  totalUnits: number;
  masteredCount: number;
}> {
  try {
    const units = await getKnowledgeUnits(userId);
    const domainCounts: Record<string, number> = {};

    units.forEach(u => {
      if (!u.domain) return;
      domainCounts[u.domain] = (domainCounts[u.domain] || 0) + 1;
    });

    const totalUnits = units.length;
    const masteredCount = units.filter(u => u.mastery_status === 'practiced' || u.mastery_status === 'confident').length;

    return {
      domains: domainCounts,
      totalUnits,
      masteredCount
    };
  } catch (error) {
    console.error('Error fetching knowledge summary for GPT:', error);
    return {
      domains: {},
      totalUnits: 0,
      masteredCount: 0
    };
  }
}

/**
 * enrichKnowledgeUnit - Lane 2
 * Updates a knowledge unit with enrichment data.
 */
export async function enrichKnowledgeUnit(
  unitId: string, 
  enrichment: { 
    retrieval_questions: any[], 
    cross_links: any[], 
    skill_tags: string[] 
  }
): Promise<void> {
  const adapter = getStorageAdapter();
  const unit = await getKnowledgeUnitById(unitId);
  if (!unit) return;

  const now = new Date().toISOString();
  
  // Merge retrieval questions (additive)
  const existingQuestions = unit.retrieval_questions || [];
  const mergedQuestions = [...existingQuestions, ...enrichment.retrieval_questions];

  // Merge skill tags into subtopic_seeds (additive + de-duped)
  const existingSeeds = unit.subtopic_seeds || [];
  const mergedSeeds = Array.from(new Set([...existingSeeds, ...enrichment.skill_tags]));

  // For cross_links, we'll store them as formatted strings in subtopic_seeds
  // This maintains type safety with the current string[] schema while still persisting the data
  const crossLinks = enrichment.cross_links.map(cl => `CrossLink: [${cl.related_domain}] ${cl.reason}`);
  const finalSeeds = [...mergedSeeds, ...crossLinks];

  await adapter.updateItem<any>('knowledge_units', unitId, {
    retrieval_questions: mergedQuestions,
    subtopic_seeds: finalSeeds,
    updated_at: now
  });
}

/**
 * runKnowledgeEnrichment - Lane 2
 * Wrapper that runs the enrichment flow and persists the result.
 * MUST swallow all errors to prevent blocking the caller (webhook).
 */
export async function runKnowledgeEnrichment(unitId: string, userId: string): Promise<void> {
  try {
    console.log(`[knowledge-service] Starting enrichment for unit: ${unitId}`);
    
    // Break circular dependency: refine-knowledge-flow imports this service
    const { refineKnowledgeFlow } = await import('@/lib/ai/flows/refine-knowledge-flow');

    const result = await runFlowSafe(
      () => refineKnowledgeFlow({ unitId, userId }),
      null
    );

    if (result) {
      await enrichKnowledgeUnit(unitId, result);
      console.log(`[knowledge-service] Enrichment completed for unit: ${unitId}`);
    } else {
      console.warn(`[knowledge-service] Enrichment skipped or failed (safe-flow returned null) for unit: ${unitId}`);
    }
  } catch (error) {
    console.error(`[knowledge-service] FATAL: runKnowledgeEnrichment failed for unit ${unitId}`, error);
    // Swallowing error as per W4 requirement: the webhook must NEVER fail because enrichment failed.
  }
}
/**
 * promoteKnowledgeProgress - Lane 6
 * Advancements mastery status by one level: unseen -> read -> practiced -> confident.
 */
export async function promoteKnowledgeProgress(userId: string, unitId: string): Promise<void> {
  const adapter = getStorageAdapter();
  const PROGRESS_ORDER: MasteryStatus[] = ['unseen', 'read', 'practiced', 'confident'];
  
  // 1. Get current status
  const existing = await adapter.query<any>('knowledge_progress', { 
    user_id: userId, 
    unit_id: unitId 
  });

  let currentStatus: MasteryStatus = 'unseen';
  if (existing.length > 0) {
    currentStatus = existing[0].mastery_status as MasteryStatus;
  }

  // 2. Determine next status
  const currentIndex = PROGRESS_ORDER.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex === PROGRESS_ORDER.length - 1) {
    return; // Already at max or unknown
  }

  const nextStatus = PROGRESS_ORDER[currentIndex + 1];

  // 3. Update or create progress record
  const now = new Date().toISOString();
  if (existing.length > 0) {
    await adapter.updateItem<any>('knowledge_progress', existing[0].id, {
      mastery_status: nextStatus,
      last_studied_at: now
    });
  } else {
    await adapter.saveItem<any>('knowledge_progress', {
      id: generateId(),
      user_id: userId,
      unit_id: unitId,
      mastery_status: nextStatus,
      last_studied_at: now,
      created_at: now
    });
  }

  // 4. Also update the unit's mastery status for consistency
  await adapter.updateItem<any>('knowledge_units', unitId, {
    mastery_status: nextStatus,
    updated_at: now
  });
}

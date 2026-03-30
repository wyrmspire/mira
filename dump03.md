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

export async function getKnowledgeSummaryForGPT(userId: string): Promise<{ domains: string[]; totalUnits: number; masteredCount: number }> {
  try {
    const units = await getKnowledgeUnits(userId);
    const domains = Array.from(new Set(units.map(u => u.domain)));
    const totalUnits = units.length;
    const masteredCount = units.filter(u => u.mastery_status === 'practiced' || u.mastery_status === 'confident').length;

    return {
      domains,
      totalUnits,
      masteredCount
    };
  } catch (error) {
    console.error('Error fetching knowledge summary for GPT:', error);
    return {
      domains: [],
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

```

### lib/services/materialization-service.ts

```typescript
import type { DrillSession } from '@/types/drill'
import type { Project } from '@/types/project'
import type { Idea } from '@/types/idea'
import { createProject } from '@/lib/services/projects-service'
import { updateIdeaStatus } from '@/lib/services/ideas-service'
import { createInboxEvent } from '@/lib/services/inbox-service'

export async function materializeIdea(idea: Idea, drill: DrillSession): Promise<Project> {
  const project = await createProject({
    ideaId: idea.id,
    name: idea.title,
    summary: idea.gpt_summary,
    state: 'arena',
    health: 'green',
    currentPhase: 'Getting started',
    nextAction: 'Define first task',
    activePreviewUrl: undefined,
  })

  await updateIdeaStatus(idea.id, 'arena')

  // W4: Create inbox event to notify about project promotion
  await createInboxEvent({
    type: 'project_promoted',
    title: 'Project created',
    body: `"${idea.title}" is now in progress (scope: ${drill.scope}).`,
    severity: 'info',
    projectId: project.id,
    actionUrl: `/arena/${project.id}`,
  })

  return project
}

```

### lib/services/projects-service.ts

```typescript
import type { Project, ProjectState } from '@/types/project'
import { MAX_ARENA_PROJECTS } from '@/lib/constants'

/**
 * QUARANTINED: projects-service
 *
 * The TABLE_MAP previously routed 'projects' → 'realizations', but the
 * Supabase `realizations` table uses snake_case columns (idea_id, current_phase,
 * active_preview_url, created_at) while the TypeScript `Project` interface uses
 * camelCase (ideaId, currentPhase, activePreviewUrl, createdAt).
 *
 * Until a proper migration adds field mapping or aligns the schema,
 * this service returns empty arrays to prevent runtime crashes.
 *
 * Legacy surfaces affected: Arena, Icebox, Shipped, Killed pages.
 */

const QUARANTINE_MSG = '[projects-service] ⚠️  QUARANTINED: realizations table schema does not match Project TS type. Returning empty.'

export async function getProjects(): Promise<Project[]> {
  console.warn(QUARANTINE_MSG)
  return []
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  console.warn(QUARANTINE_MSG)
  return undefined
}

export async function getProjectsByState(state: ProjectState): Promise<Project[]> {
  console.warn(QUARANTINE_MSG)
  return []
}

export async function getArenaProjects(): Promise<Project[]> {
  return getProjectsByState('arena')
}

export async function isArenaAtCapacity(): Promise<boolean> {
  const arena = await getArenaProjects()
  return arena.length >= MAX_ARENA_PROJECTS
}

export async function createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
  throw new Error('[projects-service] QUARANTINED: Cannot create projects until realizations schema is aligned.')
}

export async function updateProjectState(id: string, state: ProjectState, extra?: Partial<Project>): Promise<Project | null> {
  console.warn(QUARANTINE_MSG)
  return null
}


```

### lib/services/prs-service.ts

```typescript
import type { PullRequest } from '@/types/pr'

/**
 * QUARANTINED: prs-service
 *
 * The TABLE_MAP previously routed 'prs' → 'realization_reviews', but the
 * Supabase table uses snake_case columns (project_id, preview_url, build_state,
 * review_status, local_number, created_at) while the TypeScript `PullRequest`
 * interface uses camelCase (projectId, previewUrl, buildState, reviewStatus,
 * number, createdAt).
 *
 * Until a proper migration adds field mapping or aligns the schema,
 * this service returns empty arrays to prevent runtime crashes.
 *
 * Legacy surfaces affected: Review page, PR cards.
 */

const QUARANTINE_MSG = '[prs-service] ⚠️  QUARANTINED: realization_reviews table schema does not match PullRequest TS type. Returning empty.'

export async function getPRsForProject(projectId: string): Promise<PullRequest[]> {
  console.warn(QUARANTINE_MSG)
  return []
}

export async function getPRById(id: string): Promise<PullRequest | undefined> {
  console.warn(QUARANTINE_MSG)
  return undefined
}

export async function createPR(data: Omit<PullRequest, 'id' | 'createdAt' | 'number'>): Promise<PullRequest> {
  throw new Error('[prs-service] QUARANTINED: Cannot create PRs until realization_reviews schema is aligned.')
}

export async function updatePR(id: string, updates: Partial<PullRequest>): Promise<PullRequest | null> {
  console.warn(QUARANTINE_MSG)
  return null
}


```

### lib/services/skill-domain-service.ts

```typescript
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

```

### lib/services/step-knowledge-link-service.ts

```typescript
// lib/services/step-knowledge-link-service.ts
import { StepKnowledgeLink, StepKnowledgeLinkRow } from '@/types/curriculum';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { generateId } from '@/lib/utils';
import { StepKnowledgeLinkType } from '@/lib/constants';

/**
 * Normalization from DB to TS
 */
function fromDB(row: StepKnowledgeLinkRow): StepKnowledgeLink {
  return {
    id: row.id,
    stepId: row.step_id,
    knowledgeUnitId: row.knowledge_unit_id,
    linkType: row.link_type,
    createdAt: row.created_at,
  };
}

/**
 * Persists a link between an experience step and a knowledge unit.
 */
export async function linkStepToKnowledge(
  stepId: string, 
  knowledgeUnitId: string, 
  linkType: StepKnowledgeLinkType = 'teaches'
): Promise<StepKnowledgeLink> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  
  const row: StepKnowledgeLinkRow = {
    id: generateId(),
    step_id: stepId,
    knowledge_unit_id: knowledgeUnitId,
    link_type: linkType,
    created_at: now,
  };

  const saved = await adapter.saveItem<StepKnowledgeLinkRow>('step_knowledge_links', row);
  return fromDB(saved);
}

/**
 * Fetches all knowledge links for a specific experience step.
 */
export async function getLinksForStep(stepId: string): Promise<StepKnowledgeLink[]> {
  const adapter = getStorageAdapter();
  // Ensure we use the correct snake_case column in the query
  const rows = await adapter.query<StepKnowledgeLinkRow>('step_knowledge_links', { step_id: stepId });
  return rows.map(fromDB);
}
/**
 * Fetches all knowledge links for all steps in an experience.
 */
export async function getLinksForExperience(instanceId: string): Promise<StepKnowledgeLink[]> {
  const adapter = getStorageAdapter();
  // We need to find all steps first, then their links
  const { getExperienceSteps } = await import('./experience-service');
  const steps = await getExperienceSteps(instanceId);
  const stepIds = steps.map(s => s.id);
  
  if (stepIds.length === 0) return [];
  
  const allLinks: StepKnowledgeLink[] = [];
  for (const stepId of stepIds) {
    const links = await getLinksForStep(stepId);
    allLinks.push(...links);
  }
  
  return allLinks;
}

/**
 * Removes a specific link between a step and a knowledge unit.
 */
export async function unlinkStepFromKnowledge(stepId: string, knowledgeUnitId: string): Promise<void> {
  const adapter = getStorageAdapter();
  // Find the lid first
  const links = await adapter.query<StepKnowledgeLinkRow>('step_knowledge_links', { 
    step_id: stepId,
    knowledge_unit_id: knowledgeUnitId 
  });
  
  if (links.length > 0) {
    await adapter.deleteItem('step_knowledge_links', links[0].id);
  }
}

```

### lib/services/synthesis-service.ts

```typescript
import { SynthesisSnapshot, GPTStatePacket, FrictionLevel } from '@/types/synthesis'
import { ProfileFacet } from '@/types/profile'
import { ExperienceInstance, ReentryContract } from '@/types/experience'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'
import { getExperienceInstances } from './experience-service'
import { getInteractionsByInstance } from './interaction-service'
import { compressGPTStateFlow } from '@/lib/ai/flows/compress-gpt-state'
import { runFlowSafe } from '@/lib/ai/safe-flow'
import { synthesizeExperienceFlow } from '@/lib/ai/flows/synthesize-experience'
import { getKnowledgeSummaryForGPT } from './knowledge-service'
import { getFacetsBySnapshot } from './facet-service'

export async function createSynthesisSnapshot(userId: string, sourceType: string, sourceId: string): Promise<SynthesisSnapshot> {
  const adapter = getStorageAdapter()
  
  // Basic summary computation for foundation pivot
  const interactions = await getInteractionsByInstance(sourceId)
  const summary = `Synthesized context from ${interactions.length} interactions in ${sourceType} ${sourceId}.`
  
  const snapshot: SynthesisSnapshot = {
    id: generateId(),
    user_id: userId,
    source_type: sourceType,
    source_id: sourceId,
    summary,
    key_signals: { interactionCount: interactions.length },
    next_candidates: [],
    created_at: new Date().toISOString()
  }

  // W3 - Enrich with AI synthesis
  const aiResult = await runFlowSafe(
    () => synthesizeExperienceFlow({ instanceId: sourceId, userId }),
    null
  )

  if (aiResult) {
    snapshot.summary = aiResult.narrative
    snapshot.key_signals = {
      ...snapshot.key_signals,
      ...aiResult.keySignals.reduce((acc, sig, i) => ({ ...acc, [`signal_${i}`]: sig }), {}),
      frictionAssessment: aiResult.frictionAssessment
    }
    snapshot.next_candidates = aiResult.nextCandidates
  }
  
  // Lane 4: Persist computed friction as a key signal if not already present
  if (sourceType === 'experience' && !snapshot.key_signals.frictionLevel) {
    const instances = await adapter.query<ExperienceInstance>('experience_instances', { id: sourceId });
    const instance = instances[0];
    if (instance && instance.friction_level) {
      snapshot.key_signals.frictionLevel = instance.friction_level;
    }
  }
  
  return adapter.saveItem<SynthesisSnapshot>('synthesis_snapshots', snapshot)
}

export async function getLatestSnapshot(userId: string): Promise<SynthesisSnapshot | null> {
  const adapter = getStorageAdapter()
  const snapshots = await adapter.query<SynthesisSnapshot>('synthesis_snapshots', { user_id: userId })
  if (snapshots.length === 0) return null
  return snapshots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
}

export async function getSynthesisForSource(userId: string, sourceType: string, sourceId: string): Promise<SynthesisSnapshot | null> {
  const adapter = getStorageAdapter()
  const snapshots = await adapter.query<SynthesisSnapshot>('synthesis_snapshots', { 
    user_id: userId,
    source_type: sourceType,
    source_id: sourceId
  })
  if (snapshots.length === 0) return null
  // Return the most recent one for this specific source
  const snapshot = snapshots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  
  // Attach facets linked to this snapshot
  snapshot.facets = await getFacetsBySnapshot(snapshot.id)
  
  return snapshot
}

import { evaluateReentryContracts } from '@/lib/experience/reentry-engine'

export async function buildGPTStatePacket(userId: string): Promise<GPTStatePacket> {
  const experiences = await getExperienceInstances({ userId })
  
  // Call re-entry engine
  const activeReentryPrompts = await evaluateReentryContracts(userId)

  // Get proposed experiences for context
  const proposedExperiences = experiences.filter(exp => 
    ['proposed', 'drafted', 'ready_for_review', 'approved'].includes(exp.status)
  )

  // Compute friction signals from experience status/metadata
  const frictionSignals = experiences
    .filter(exp => exp.friction_level)
    .map(exp => ({
      instanceId: exp.id,
      level: exp.friction_level as FrictionLevel
    }))

  const snapshot = await getLatestSnapshot(userId)

  // Create the base packet first
  const packet: GPTStatePacket = {
    latestExperiences: experiences.slice(0, 5).map(e => ({ ...e } as ExperienceInstance)),
    activeReentryPrompts: activeReentryPrompts.map(p => ({
      ...p,
      priority: p.priority // Explicitly ensure priority is carried
    })),
    frictionSignals,
    suggestedNext: experiences[0]?.next_suggested_ids || [],
    synthesisSnapshot: snapshot,
    proposedExperiences: proposedExperiences.slice(0, 3).map(e => ({ ...e } as ExperienceInstance)),
    reentryCount: activeReentryPrompts.length
  }

  // W2 - Enrich with compressed state
  // tokenBudget is optional in the flow but Genkit TS might need it if z.number().default(800) inferred it as mandatory in the type
  const compressedResult = await runFlowSafe(
    () => compressGPTStateFlow({ rawStateJSON: JSON.stringify(packet), tokenBudget: 800 }),
    null
  )

  if (compressedResult) {
    packet.compressedState = {
      narrative: compressedResult.compressedNarrative,
      prioritySignals: compressedResult.prioritySignals,
      suggestedOpeningTopic: compressedResult.suggestedOpeningTopic
    }
  }

  // Lane 5: Add knowledge summary
  try {
    (packet as any).knowledgeSummary = await getKnowledgeSummaryForGPT(userId)
  } catch (error) {
    (packet as any).knowledgeSummary = null
  }

  return packet
}

```

### lib/services/tasks-service.ts

```typescript
import type { Task } from '@/types/task'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

export async function getTasksForProject(projectId: string): Promise<Task[]> {
  const adapter = getStorageAdapter()
  const tasks = await adapter.getCollection<Task>('tasks')
  return tasks.filter((t) => t.projectId === projectId)
}

export async function createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const adapter = getStorageAdapter()
  const task: Task = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  return adapter.saveItem<Task>('tasks', task)
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const adapter = getStorageAdapter()
  try {
    return await adapter.updateItem<Task>('tasks', id, updates)
  } catch {
    return null
  }
}

```

### lib/services/timeline-service.ts

```typescript
import { TimelineEntry, TimelineFilter, TimelineStats, TimelineCategory } from '@/types/timeline'
import { getInboxEvents } from './inbox-service'
import { getExperienceInstances } from './experience-service'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { InteractionEvent } from '@/types/interaction'
import { getKnowledgeUnits, getKnowledgeProgress } from './knowledge-service'

/**
 * Aggregates events from multiple sources:
 * - timeline_events table (via getInboxEvents)
 * - experience_instances table (lifecycle events)
 * - interaction_events table (step completions)
 * - knowledge_units table (new arrivals)
 * - knowledge_progress table (mastery promotions)
 */
export async function getTimelineEntries(userId: string, filter?: TimelineFilter): Promise<TimelineEntry[]> {
  const [
    inboxEvents, 
    experienceEntries, 
    interactionEntries,
    knowledgeUnits,
    knowledgeProgress
  ] = await Promise.all([
    getInboxEvents(), 
    generateExperienceTimelineEntries(userId),
    generateInteractionTimelineEntries(userId),
    getKnowledgeUnits(userId),
    getKnowledgeProgress(userId)
  ])

  // Aggregate all entries
  let allEntries: TimelineEntry[] = [
    ...inboxEvents.map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      category: mapInboxTypeToTimelineCategory(event.type),
      title: event.title,
      body: event.body,
      entityId: event.projectId,
      entityType: event.projectId ? 'project' : undefined,
      actionUrl: event.actionUrl,
      metadata: { severity: event.severity, read: event.read }
    }) as TimelineEntry),
    ...experienceEntries,
    ...interactionEntries,
    ...knowledgeUnits
      .filter(unit => {
        // Only show units created in the last 7 days
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return new Date(unit.created_at) >= sevenDaysAgo
      })
      .map(unit => ({
        id: `ku-arrival-${unit.id}`,
        timestamp: unit.created_at,
        category: 'system',
        title: `Research arrived: ${unit.title}`,
        body: unit.thesis,
        entityId: unit.id,
        entityType: 'knowledge',
        actionUrl: `/knowledge/${unit.id}`,
      }) as TimelineEntry),
    ...knowledgeProgress
      .filter(p => p.mastery_status !== 'unseen')
      .map(p => {
        const unit = knowledgeUnits.find(u => u.id === p.unit_id)
        return {
          id: `kp-promotion-${p.id}`,
          timestamp: p.created_at, // Using created_at of progress record for the promotion event
          category: 'system',
          title: `Mastery level increased: ${unit?.title || 'Unknown Topic'}`,
          body: `Now at ${p.mastery_status} level.`,
          entityId: p.unit_id,
          entityType: 'knowledge',
          actionUrl: `/knowledge/${p.unit_id}`,
        } as TimelineEntry
      })
  ]

  // Enrich completion timestamps: if we have a real experience_completed interaction event,
  // use its timestamp instead of the proxy on the exp-completed entry.
  for (const entry of allEntries) {
    if (entry.id.startsWith('exp-completed-') && entry.entityId) {
      const realEvent = interactionEntries.find(
        ie => ie.entityId === entry.entityId && ie.title === 'Experience completed'
      )
      if (realEvent) {
        entry.timestamp = realEvent.timestamp
      }
    }
  }

  // Filter if requested
  if (filter?.category) {
    allEntries = allEntries.filter(e => e.category === filter.category)
  }

  // Sort by timestamp descending
  allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Limit results
  const limit = filter?.limit ?? 50
  return allEntries.slice(0, limit)
}

/**
 * Generates timeline entries from experience lifecycle timestamps.
 */
export async function generateExperienceTimelineEntries(userId: string): Promise<TimelineEntry[]> {
  const instances = await getExperienceInstances({ userId })
  const entries: TimelineEntry[] = []

  for (const instance of instances) {
    const isEphemeral = instance.instance_type === 'ephemeral'
    
    // 1. Proposed / Injected
    entries.push({
      id: `exp-proposed-${instance.id}`,
      timestamp: instance.created_at,
      category: 'experience',
      title: `${isEphemeral ? 'Ephemeral Moment' : 'Experience'} proposed: ${instance.title}`,
      entityId: instance.id,
      entityType: 'experience',
      actionUrl: `/workspace/${instance.id}`,
      metadata: { ephemeral: isEphemeral }
    })

    // 2. Published
    if (instance.published_at) {
      entries.push({
        id: `exp-published-${instance.id}`,
        timestamp: instance.published_at,
        category: 'experience',
        title: `${isEphemeral ? 'Ephemeral Moment' : 'Experience'} published: ${instance.title}`,
        entityId: instance.id,
        entityType: 'experience',
        actionUrl: `/workspace/${instance.id}`,
        metadata: { ephemeral: isEphemeral }
      })
    }

    // 3. Completed — use real telemetry timestamp, not the proxy created_at
    if (instance.status === 'completed') {
      entries.push({
        id: `exp-completed-${instance.id}`,
        timestamp: instance.published_at || instance.created_at,
        category: 'experience',
        title: `${isEphemeral ? 'Ephemeral Moment' : 'Experience'} completed: ${instance.title}`,
        entityId: instance.id,
        entityType: 'experience',
        actionUrl: `/workspace/${instance.id}`,
        metadata: { ephemeral: isEphemeral }
      })
    }
  }

  return entries
}

/**
 * Aggregates interaction events into meaningful timeline entries.
 */
export async function generateInteractionTimelineEntries(userId: string): Promise<TimelineEntry[]> {
  const adapter = getStorageAdapter()
  const interactions = await adapter.getCollection<InteractionEvent>('interaction_events')
  
  const entries: TimelineEntry[] = []
  
  const completionEvents = interactions.filter(i => 
    i.event_type === 'task_completed' || 
    i.event_type === 'experience_completed'
  )

  for (const event of completionEvents) {
    entries.push({
      id: event.id,
      timestamp: event.created_at,
      category: 'experience',
      title: event.event_type === 'experience_completed' 
        ? 'Experience completed' 
        : 'Step completed',
      entityId: event.instance_id,
      entityType: 'experience',
      actionUrl: `/workspace/${event.instance_id}`,
      metadata: { stepId: event.step_id }
    })
  }

  return entries
}

export async function getTimelineStats(userId: string): Promise<TimelineStats> {
  const entries = await getTimelineEntries(userId, { limit: 1000 })
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  return {
    totalEvents: entries.length,
    experienceEvents: entries.filter(e => e.category === 'experience').length,
    ideaEvents: entries.filter(e => e.category === 'idea').length,
    systemEvents: entries.filter(e => e.category === 'system').length,
    githubEvents: entries.filter(e => e.category === 'github').length,
    thisWeek: entries.filter(e => new Date(e.timestamp) >= oneWeekAgo).length
  }
}

function mapInboxTypeToTimelineCategory(type: string): TimelineCategory {
  if (type.startsWith('github_')) return 'github'
  if (type.startsWith('idea_') || type === 'drill_completed') return 'idea'
  if (type.startsWith('project_') || type.startsWith('task_') || type.startsWith('pr_')) return 'experience'
  return 'system'
}


```

### lib/state-machine.ts

```typescript
import type { IdeaStatus } from '@/types/idea'
import type { ProjectState } from '@/types/project'
import type { ReviewStatus } from '@/types/pr'
import type { ExperienceStatus } from '@/types/experience'
import type { GoalStatus } from '@/types/goal'

type IdeaTransition = {
  from: IdeaStatus
  to: IdeaStatus
  action: string
}

type ProjectTransition = {
  from: ProjectState
  to: ProjectState
  action: string
}

export const IDEA_TRANSITIONS: IdeaTransition[] = [
  { from: 'captured', to: 'drilling', action: 'start_drill' },
  { from: 'drilling', to: 'arena', action: 'commit_to_arena' },
  { from: 'drilling', to: 'icebox', action: 'send_to_icebox' },
  { from: 'drilling', to: 'killed', action: 'kill_from_drill' },
  { from: 'captured', to: 'icebox', action: 'defer_from_send' },
  { from: 'captured', to: 'killed', action: 'kill_from_send' },
]

export const PROJECT_TRANSITIONS: ProjectTransition[] = [
  { from: 'arena', to: 'shipped', action: 'mark_shipped' },
  { from: 'arena', to: 'killed', action: 'kill_project' },
  { from: 'arena', to: 'icebox', action: 'move_to_icebox' },
  { from: 'icebox', to: 'arena', action: 'promote_to_arena' },
  { from: 'icebox', to: 'killed', action: 'kill_from_icebox' },
  // GitHub-backed transitions (project stays in arena but gains linkage / execution state)
  { from: 'arena', to: 'arena', action: 'github_issue_created' },
  { from: 'arena', to: 'arena', action: 'workflow_dispatched' },
  { from: 'arena', to: 'arena', action: 'pr_received' },
  // Merge = ship (optional auto-ship path when real GitHub PR merges)
  { from: 'arena', to: 'shipped', action: 'github_pr_merged' },
]

export function canTransitionIdea(from: IdeaStatus, action: string): boolean {
  return IDEA_TRANSITIONS.some((t) => t.from === from && t.action === action)
}

export function canTransitionProject(from: ProjectState, action: string): boolean {
  return PROJECT_TRANSITIONS.some((t) => t.from === from && t.action === action)
}

export function getNextIdeaState(from: IdeaStatus, action: string): IdeaStatus | null {
  const transition = IDEA_TRANSITIONS.find(
    (t) => t.from === from && t.action === action
  )
  return transition ? transition.to : null
}

export function getNextProjectState(from: ProjectState, action: string): ProjectState | null {
  const transition = PROJECT_TRANSITIONS.find(
    (t) => t.from === from && t.action === action
  )
  return transition ? transition.to : null
}

// ---------------------------------------------------------------------------
// PR State Machine
// ---------------------------------------------------------------------------

export type PRTransitionAction =
  | 'open'
  | 'request_changes'
  | 'approve'
  | 'merge'
  | 'close'
  | 'reopen'

export const PR_TRANSITIONS: Array<{
  from: ReviewStatus
  to: ReviewStatus
  action: PRTransitionAction
}> = [
  { from: 'pending', to: 'changes_requested', action: 'request_changes' },
  { from: 'pending', to: 'approved', action: 'approve' },
  { from: 'pending', to: 'merged', action: 'merge' },
  { from: 'changes_requested', to: 'approved', action: 'approve' },
  { from: 'changes_requested', to: 'merged', action: 'merge' },
  { from: 'approved', to: 'merged', action: 'merge' },
  { from: 'approved', to: 'changes_requested', action: 'request_changes' },
]

export function canTransitionPR(from: ReviewStatus, action: PRTransitionAction): boolean {
  return PR_TRANSITIONS.some((t) => t.from === from && t.action === action)
}

export function getNextPRState(from: ReviewStatus, action: PRTransitionAction): ReviewStatus | null {
  const transition = PR_TRANSITIONS.find(
    (t) => t.from === from && t.action === action
  )
  return transition ? transition.to : null
}

// ---------------------------------------------------------------------------
// Experience State Machine
// ---------------------------------------------------------------------------

export type ExperienceTransitionAction =
  | 'draft'
  | 'submit_for_review'
  | 'request_changes'
  | 'approve'
  | 'publish'
  | 'activate'
  | 'complete'
  | 'archive'
  | 'supersede'
  | 'start'

type ExperienceTransition = {
  from: ExperienceStatus
  to: ExperienceStatus
  action: ExperienceTransitionAction
}

export const EXPERIENCE_TRANSITIONS: ExperienceTransition[] = [
  // Persistent Flow
  { from: 'proposed', to: 'drafted', action: 'draft' },
  { from: 'drafted', to: 'ready_for_review', action: 'submit_for_review' },
  { from: 'ready_for_review', to: 'drafted', action: 'request_changes' },
  { from: 'ready_for_review', to: 'approved', action: 'approve' },
  { from: 'approved', to: 'published', action: 'publish' },
  { from: 'published', to: 'active', action: 'activate' },
  { from: 'active', to: 'completed', action: 'complete' },
  { from: 'completed', to: 'archived', action: 'archive' },

  // Shortcut transitions for "Accept & Start" one-click flow
  // UI sends approve→publish→activate from proposed status
  { from: 'proposed', to: 'approved', action: 'approve' },

  // Pre-completed supersede
  { from: 'proposed', to: 'superseded', action: 'supersede' },
  { from: 'drafted', to: 'superseded', action: 'supersede' },
  { from: 'ready_for_review', to: 'superseded', action: 'supersede' },
  { from: 'approved', to: 'superseded', action: 'supersede' },
  { from: 'published', to: 'superseded', action: 'supersede' },
  { from: 'active', to: 'superseded', action: 'supersede' },

  // Ephemeral Flow
  { from: 'injected', to: 'active', action: 'start' },
  { from: 'active', to: 'completed', action: 'complete' },
  { from: 'completed', to: 'archived', action: 'archive' },
]

export function canTransitionExperience(
  from: ExperienceStatus,
  action: ExperienceTransitionAction
): boolean {
  return EXPERIENCE_TRANSITIONS.some((t) => t.from === from && t.action === action)
}

export function getNextExperienceState(
  from: ExperienceStatus,
  action: ExperienceTransitionAction
): ExperienceStatus | null {
  const transition = EXPERIENCE_TRANSITIONS.find(
    (t) => t.from === from && t.action === action
  )
  return transition ? transition.to : null
}

// ---------------------------------------------------------------------------
// Goal State Machine (Sprint 13)
// ---------------------------------------------------------------------------

export type GoalTransitionAction =
  | 'activate'
  | 'pause'
  | 'resume'
  | 'complete'
  | 'archive'

type GoalTransition = {
  from: GoalStatus
  to: GoalStatus
  action: GoalTransitionAction
}

export const GOAL_TRANSITIONS: GoalTransition[] = [
  { from: 'intake', to: 'active', action: 'activate' },
  { from: 'active', to: 'paused', action: 'pause' },
  { from: 'paused', to: 'active', action: 'resume' },
  { from: 'active', to: 'completed', action: 'complete' },
  { from: 'completed', to: 'archived', action: 'archive' },
]

export function canTransitionGoal(from: GoalStatus, action: GoalTransitionAction): boolean {
  return GOAL_TRANSITIONS.some((t) => t.from === from && t.action === action)
}

export function getNextGoalState(from: GoalStatus, action: GoalTransitionAction): GoalStatus | null {
  const transition = GOAL_TRANSITIONS.find(
    (t) => t.from === from && t.action === action
  )
  return transition ? transition.to : null
}


```

### lib/storage.ts

```typescript
import fs from 'fs'
import path from 'path'
import os from 'os'
import type { Idea } from '@/types/idea'
import type { Project } from '@/types/project'
import type { Task } from '@/types/task'
import type { PullRequest } from '@/types/pr'
import type { InboxEvent } from '@/types/inbox'
import type { DrillSession } from '@/types/drill'
import type { AgentRun } from '@/types/agent-run'
import type { ExternalRef } from '@/types/external-ref'
import { STORAGE_DIR, STORAGE_PATH } from '@/lib/constants'
import { getSeedData } from '@/lib/seed-data'

export interface StudioStore {
  ideas: Idea[]
  drillSessions: DrillSession[]
  projects: Project[]
  tasks: Task[]
  prs: PullRequest[]
  inbox: InboxEvent[]
  agentRuns: AgentRun[]
  externalRefs: ExternalRef[]
  
  // Sprint 3: Experience Engine (JSON fallback collections)
  experience_templates?: any[]
  experience_instances?: any[]
  experience_steps?: any[]
  interaction_events?: any[]
  artifacts?: any[]
  synthesis_snapshots?: any[]
  profile_facets?: any[]
  conversations?: any[]
  
  // Sprint 10+ (Goal OS & Intelligence)
  timeline_events?: any[]
  goals?: any[]
  skill_domains?: any[]
  curriculum_outlines?: any[]
  step_knowledge_links?: any[]
  knowledge_units?: any[]
  knowledge_progress?: any[]
  
  // Sprint 17 (Changes Tracker)
  change_reports?: any[]
}

// Full paths for fs operations
const FULL_STORAGE_DIR = path.join(process.cwd(), STORAGE_DIR)
const FULL_STORAGE_PATH = path.join(process.cwd(), STORAGE_PATH)

function ensureDir(): void {
  if (!fs.existsSync(FULL_STORAGE_DIR)) {
    fs.mkdirSync(FULL_STORAGE_DIR, { recursive: true })
  }
}

/** Defaults for keys added in Sprint 2 & 3 — ensures old JSON files auto-migrate. */
const STORE_DEFAULTS: Partial<StudioStore> = {
  agentRuns: [],
  externalRefs: [],
  experience_templates: [],
  experience_instances: [],
  experience_steps: [],
  interaction_events: [],
  artifacts: [],
  synthesis_snapshots: [],
  profile_facets: [],
  conversations: [],
  timeline_events: [],
  goals: [],
  skill_domains: [],
  curriculum_outlines: [],
  step_knowledge_links: [],
  knowledge_units: [],
  knowledge_progress: [],
  change_reports: [],
}

export function readStore(): StudioStore {
  ensureDir()
  if (!fs.existsSync(FULL_STORAGE_PATH)) {
    const seed = getSeedData()
    writeStore(seed)
    return seed
  }
  const raw = fs.readFileSync(FULL_STORAGE_PATH, 'utf-8')
  const parsed = JSON.parse(raw) as Partial<StudioStore>
  // Auto-migrate: merge any missing keys introduced in later sprints
  return { ...STORE_DEFAULTS, ...parsed } as StudioStore
}

export function writeStore(data: StudioStore): void {
  ensureDir()
  // Atomic write: write to a temp file then rename to avoid partial reads
  const tmpPath = path.join(os.tmpdir(), `studio-${Date.now()}.tmp.json`)
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmpPath, FULL_STORAGE_PATH)
}

export function getCollection<K extends keyof StudioStore>(name: K): StudioStore[K] {
  const store = readStore()
  return store[name]
}

export function saveCollection<K extends keyof StudioStore>(name: K, data: StudioStore[K]): void {
  const store = readStore()
  store[name] = data
  writeStore(store)
}


```

### lib/storage-adapter.ts

```typescript
import { getSupabaseClient } from '@/lib/supabase/client'
import * as jsonStorage from '@/lib/storage'
import { generateId } from '@/lib/utils'

export interface StorageAdapter {
  getCollection<T>(name: string): Promise<T[]>
  saveItem<T>(collection: string, item: T): Promise<T>
  updateItem<T>(collection: string, id: string, updates: Partial<T>): Promise<T>
  deleteItem(collection: string, id: string): Promise<void>
  query<T>(collection: string, filters: Record<string, unknown>): Promise<T[]>
  queryIn<T>(collection: string, column: string, values: any[]): Promise<T[]>
}

/**
 * Maps local collection names to Supabase table names.
 *
 * QUARANTINED (removed in stabilization pass):
 *   projects → realizations    — camelCase TS type vs snake_case DB columns
 *   prs      → realization_reviews — same mismatch
 *   tasks    → experience_steps    — collision with direct experience_steps usage
 *   inbox    → timeline_events     — handled by inbox-service normalization layer
 */
const TABLE_MAP: Record<string, string> = {
  ideas: 'ideas',
  drillSessions: 'drill_sessions',
  inbox: 'timeline_events',
  agentRuns: 'agent_runs',
  externalRefs: 'external_refs',
  experience_templates: 'experience_templates',
  experience_instances: 'experience_instances',
  experience_steps: 'experience_steps',
  interaction_events: 'interaction_events',
  artifacts: 'artifacts',
  synthesis_snapshots: 'synthesis_snapshots',
  profile_facets: 'profile_facets',
  step_knowledge_links: 'step_knowledge_links',
}

let _adapterLogged = false

export class SupabaseStorageAdapter implements StorageAdapter {
  private client = getSupabaseClient()

  private getTableName(collection: string): string {
    return TABLE_MAP[collection] || collection
  }

  async getCollection<T>(name: string): Promise<T[]> {
    if (!this.client) throw new Error('Supabase client not configured')
    const { data, error } = await this.client.from(this.getTableName(name)).select('*')
    if (error) throw error
    return data as T[]
  }

  async saveItem<T>(collection: string, item: T): Promise<T> {
    if (!this.client) throw new Error('Supabase client not configured')
    const { data, error } = await this.client
      .from(this.getTableName(collection))
      .insert(item as any)
      .select()
      .single()
    if (error) throw error
    return data as T
  }

  async updateItem<T>(collection: string, id: string, updates: Partial<T>): Promise<T> {
    if (!this.client) throw new Error('Supabase client not configured')
    const { data, error } = await this.client
      .from(this.getTableName(collection))
      .update(updates as any)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as T
  }

  async deleteItem(collection: string, id: string): Promise<void> {
    if (!this.client) throw new Error('Supabase client not configured')
    const { error } = await this.client.from(this.getTableName(collection)).delete().eq('id', id)
    if (error) throw error
  }

  async query<T>(collection: string, filters: Record<string, unknown>): Promise<T[]> {
    if (!this.client) throw new Error('Supabase client not configured')
    let query = this.client.from(this.getTableName(collection)).select('*')
    
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value as string | number | boolean)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data as T[]
  }

  async queryIn<T>(collection: string, column: string, values: any[]): Promise<T[]> {
    if (!this.client) throw new Error('Supabase client not configured')
    if (!values || values.length === 0) return []
    
    const { data, error } = await this.client
      .from(this.getTableName(collection))
      .select('*')
      .in(column, values)
      
    if (error) throw error
    return data as T[]
  }
}

/**
 * Adapter for existing JSON file storage.
 * Only active when USE_JSON_FALLBACK=true is explicitly set.
 */
export class JsonFileStorageAdapter implements StorageAdapter {
  async getCollection<T>(name: string): Promise<T[]> {
    return jsonStorage.getCollection(name as any) as unknown as T[]
  }

  async saveItem<T>(collection: string, item: any): Promise<T> {
    const list = jsonStorage.getCollection(collection as any)
    const newItem = { ...item, id: item.id || generateId() }
    list.push(newItem)
    jsonStorage.saveCollection(collection as any, list)
    return newItem as T
  }

  async updateItem<T>(collection: string, id: string, updates: Partial<T>): Promise<T> {
    const list = jsonStorage.getCollection(collection as any)
    const index = list.findIndex((item: any) => item.id === id)
    if (index === -1) throw new Error(`Item with id ${id} not found in ${collection}`)
    
    list[index] = { ...list[index], ...updates }
    jsonStorage.saveCollection(collection as any, list)
    return list[index] as any as T
  }

  async deleteItem(collection: string, id: string): Promise<void> {
    const list = jsonStorage.getCollection(collection as any)
    const newList = list.filter((item: any) => item.id !== id)
    jsonStorage.saveCollection(collection as any, newList)
  }

  async query<T>(collection: string, filters: Record<string, unknown>): Promise<T[]> {
    const list = jsonStorage.getCollection(collection as any) as unknown as any[]
    return list.filter((item) => {
      return Object.entries(filters).every(([key, value]) => item[key] === value)
    }) as T[]
  }

  async queryIn<T>(collection: string, column: string, values: any[]): Promise<T[]> {
    if (!values || values.length === 0) return []
    const list = jsonStorage.getCollection(collection as any) as unknown as any[]
    return list.filter((item) => values.includes(item[column])) as T[]
  }
}

export function getStorageAdapter(): StorageAdapter {
  // Explicit JSON fallback — only when explicitly opted in
  if (process.env.USE_JSON_FALLBACK === 'true') {
    if (!_adapterLogged) {
      console.log('[StorageAdapter] ⚠️  JSON fallback explicitly enabled via USE_JSON_FALLBACK=true')
      _adapterLogged = true
    }
    return new JsonFileStorageAdapter()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseKey) {
    if (!_adapterLogged) {
      console.log('[StorageAdapter] ✅ Using SupabaseStorageAdapter')
      _adapterLogged = true
    }
    return new SupabaseStorageAdapter()
  }

  // Fail fast — no more silent fallback
  throw new Error(
    '[StorageAdapter] FATAL: Supabase not configured. ' +
    'Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local, ' +
    'or set USE_JSON_FALLBACK=true for local JSON mode.'
  )
}

```

### lib/studio-copy.ts

```typescript
export const COPY = {
  app: {
    name: 'Mira',
    tagline: 'Your ideas, shaped and shipped.',
  },
  home: {
    heading: 'Studio',
    subheading: 'Your attention cockpit.',
    sections: {
      attention: 'Needs attention',
      inProgress: 'In progress',
      activity: 'Recent activity',
    },
    attentionCaughtUp: "You're all caught up.",
    activitySeeAll: 'See all →',
    suggestedSection: 'Suggested for You',
    activeSection: 'Active Journeys',
    emptySuggested: 'No new suggestions from Mira.',
    emptyActive: 'No active journeys.',
  },
  send: {
    heading: 'Ideas from GPT',
    subheading: 'Review what arrived and decide what to do next.',
    ctaPrimary: 'Define in Studio',
    ctaIcebox: 'Put on hold',
    ctaKill: 'Remove',
  },
  drill: {
    heading: "Let's define this.",
    progress: 'Step {current} of {total}',
    steps: {
      intent: {
        question: 'What is this really?',
        hint: 'Strip the excitement. What is the actual thing?',
      },
      success_metric: {
        question: 'How do you know it worked?',
        hint: "One metric. If you can't name it, the idea isn't ready.",
      },
      scope: {
        question: 'How big is this?',
        hint: 'Be honest. Scope creep starts here.',
      },
      path: {
        question: 'How does this get built?',
        hint: 'Solo, assisted, or fully delegated?',
      },
      priority: {
        question: 'Does this belong now?',
        hint: 'What would you not do if you commit to this?',
      },
      decision: {
        question: "What's the call?",
        hint: 'Commit, hold, or remove. Every idea gets a clear decision.',
      },
    },
    cta: {
      next: 'Next →',
      back: '← Back',
      commit: 'Start building',
      icebox: 'Put on hold',
      kill: 'Remove this idea',
    },
  },
  arena: {
    heading: 'In Progress',
    empty: 'No active projects. Define an idea to get started.',
    limitReached: "You're at capacity. Ship or remove something first.",
    limitBanner: 'Active limit: {count}/{max}',
  },
  icebox: {
    heading: 'On Hold',
    subheading: 'Ideas and projects on pause',
    empty: 'Nothing on hold right now.',
    staleWarning: 'This idea has been here for {days} days. Time to decide.',
  },
  shipped: {
    heading: 'Shipped',
    empty: 'Nothing shipped yet.',
  },
  killed: {
    heading: 'Removed',
    empty: 'Nothing removed yet.',
    resurrection: 'Restore',
  },
  inbox: {
    heading: 'Inbox',
    empty: 'No new events.',
    filters: {
      all: 'All',
      unread: 'Unread',
      errors: 'Errors',
    },
    markRead: 'Mark as read',
  },
  common: {
    loading: 'Working...',
    error: 'Something went wrong.',
    confirm: 'Are you sure?',
    cancel: 'Cancel',
    save: 'Save',
  },
  github: {
    heading: 'GitHub Integration',
    connectionSuccess: 'Connected to GitHub',
    connectionFailed: 'Could not connect to GitHub',
    issueCreated: 'GitHub issue created',
    workflowDispatched: 'Build started',
    workflowFailed: 'Build failed',
    prOpened: 'Pull request opened',
    prMerged: 'Pull request merged',
    copilotAssigned: 'Copilot is working on this',
    syncFailed: 'GitHub sync failed',
    mergeBlocked: 'Cannot merge — checks did not pass',
    notLinked: 'Not linked to GitHub',
  },
  experience: {
    heading: 'Experience',
    workspace: 'Workspace',
    timeline: 'Timeline',
    profile: 'Profile',
    approve: 'Approve Experience',
    publish: 'Publish',
    preview: 'Preview Experience',
    requestChanges: 'Request Changes',
    ephemeral: 'Moment',
    persistent: 'Experience',
    timelinePage: {
      heading: 'Timeline',
      subheading: 'Everything that happened, in order.',
      emptyAll: 'No events yet.',
      emptyExperiences: 'No experience events.',
      emptyIdeas: 'No idea events.',
      emptySystem: 'No system events.',
      filterAll: 'All',
      filterExperiences: 'Experiences',
      filterIdeas: 'Ideas',
      filterSystem: 'System',
    }
  },
  library: {
    heading: 'Library',
    subheading: 'Your experiences.',
    activeSection: 'Active Journeys',
    completedSection: 'Completed',
    momentsSection: 'Moments',
    reviewSection: 'Suggested for You',
    tracksSection: 'Current Tracks',
    emptyActive: 'No active journeys.',
    emptyCompleted: 'No completed experiences yet.',
    emptyMoments: 'No moments yet.',
    emptyReview: 'No new suggestions.',
    emptyTracks: 'No planning tracks found.',
    enter: 'Continue Journey',
    acceptAndStart: 'Accept & Start',
  },
  completion: {
    heading: 'Journey Complete',
    body: 'Mira has synthesized your progress. Return to chat whenever you\'re ready for the next step.',
    returnToLibrary: 'View Library',
    returnToChat: 'Your next conversation with Mira will pick up from here.',
  },
  profilePage: {
    heading: 'Profile',
    subheading: 'Your direction, compiled from action.',
    emptyState: 'Your profile builds as you complete experiences.',
    sections: {
      interests: 'Interests',
      skills: 'Skills',
      goals: 'Goals',
      preferences: 'Preferences',
    }
  },
  workspace: {
    overview: 'Experience Overview',
    resume: 'Resume Where You Left Off',
    backToOverview: '← Overview',
    backToLibrary: '← Library',
    stepsCompleted: '{count} of {total} completed',
    estimatedRemaining: 'Est. {time} remaining',
    locked: 'Complete previous steps first',
    stepTypes: { 
      questionnaire: 'Questionnaire', 
      lesson: 'Lesson', 
      challenge: 'Challenge', 
      reflection: 'Reflection', 
      plan_builder: 'Plan Builder', 
      essay_tasks: 'Essay + Tasks' 
    }
  },
  knowledge: {
    heading: 'Knowledge',
    subheading: 'Your terrain, mapped from action.',
    emptyState: 'Your knowledge base grows as you explore experiences.',
    sections: {
      domains: 'Domains',
      companion: 'Related Knowledge',
      recentlyAdded: 'Recently Added',
    },
    unitTypes: {
      foundation: 'Foundation',
      playbook: 'Playbook',
      deep_dive: 'Deep Dive',
      example: 'Example',
      audio_script: 'Audio Script',
    },
    mastery: {
      unseen: 'New',
      read: 'Read',
      practiced: 'Practiced',
      confident: 'Confident',
    },
    actions: {
      markRead: 'Mark as Read',
      markPracticed: 'Mark as Practiced',
      markConfident: 'Mark as Confident',
      startExperience: 'Start Related Experience',
      learnMore: '📖 Learn about this',
      viewAll: 'View All →',
    },
  },
  // --- Sprint 13: Goal OS + Skill Map ---
  skills: {
    heading: 'Skill Tree',
    subheading: 'Your trajectory through the domain map.',
    emptyState: 'Define a goal to map your skill terrain.',
    masteryBadge: 'Level',
    evidenceTitle: 'Evidence',
    domainProgress: 'Domain Mastery',
    neededForNext: '{count} more experiences to reach {level}',
    maxLevel: 'Max level reached',
    experiencesDone: '{completed} of {total} experiences done',
    allCompleted: 'All experiences completed — explore more →',
    actions: {
      viewTree: 'View Skill Tree',
      whatNext: 'What\'s next →',
    },
    detail: {
      experiencesTitle: 'Experiences',
      knowledgeTitle: 'Knowledge',
      emptyExperiences: 'No experiences linked to this domain.',
      emptyKnowledge: 'No knowledge units linked to this domain.',
      backLink: '← Back to Skill Tree',
    }
  },
  goals: {
    heading: 'Active Goal',
    emptyState: 'Set a goal to personalize your path →',
    actions: {
      createGoal: 'Set New Goal',
      editGoal: 'Refine Goal',
    },
    summary: {
      domains: '{count} domains mapped',
      mastery: '{count} at {level}+',
    },
  },
}

```

### lib/supabase/browser.ts

```typescript
import { createClient } from '@supabase/supabase-js'

let browserClient: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Supabase: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing. Falling back to null.')
    }
    return null
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseKey)
  }

  return browserClient
}

```

### lib/supabase/client.ts

```typescript
import { createClient } from '@supabase/supabase-js'

export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Supabase: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Falling back to null.')
    }
    return null
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      // Next.js 14 App Router caches ALL fetch() calls by default.
      // The Supabase JS client uses fetch internally, so without this override,
      // every Supabase query result gets cached indefinitely — causing stale UI data.
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          cache: 'no-store',
        })
      },
    },
  })
}

```

### lib/utils.ts

```typescript
export function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback v4-like UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

```

### lib/validators/curriculum-validator.ts

```typescript
// lib/validators/curriculum-validator.ts
import { CurriculumOutline } from '@/types/curriculum';
import { CURRICULUM_STATUSES } from '@/lib/constants';

/**
 * Validates the incoming curriculum outline data.
 * Used by the Planning API and CurriculumOutlineService.
 * Follows the Mira convention of supporting both camelCase and snake_case in input,
 * while returning a validated partial of the TS interface.
 */
export function validateCurriculumOutline(data: any): { 
  valid: boolean; 
  error?: string; 
  data?: Partial<CurriculumOutline> 
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Curriculum outline must be an object' };
  }

  const topic = data.topic;
  const subtopics = data.subtopics;
  const status = data.status;
  const pedagogicalIntent = data.pedagogicalIntent ?? data.pedagogical_intent;

  if (!topic || typeof topic !== 'string' || topic.trim() === '') {
    return { valid: false, error: 'Missing or invalid topic (non-empty string required)' };
  }

  if (subtopics && !Array.isArray(subtopics)) {
    return { valid: false, error: 'subtopics must be an array' };
  }

  if (Array.isArray(subtopics)) {
    for (let i = 0; i < subtopics.length; i++) {
      const s = subtopics[i];
      if (!s.title || typeof s.title !== 'string') {
        return { valid: false, error: `Subtopic at index ${i} missing title` };
      }
      if (s.order !== undefined && typeof s.order !== 'number') {
        return { valid: false, error: `Subtopic at index ${i} has invalid order (must be number)` };
      }
    }
  }

  if (status && !(CURRICULUM_STATUSES as readonly string[]).includes(status)) {
    return { 
      valid: false, 
      error: `Invalid status: ${status}. Expected one of: ${CURRICULUM_STATUSES.join(', ')}` 
    };
  }

  if (pedagogicalIntent && typeof pedagogicalIntent !== 'string') {
    return { valid: false, error: 'pedagogicalIntent must be a string' };
  }

  return { valid: true, data: data as Partial<CurriculumOutline> };
}

/**
 * Validates a StepKnowledgeLink creation request.
 */
export function validateStepKnowledgeLink(data: any): { 
  valid: boolean; 
  error?: string; 
  data?: { stepId: string; knowledgeUnitId: string; linkType: any } 
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Link data must be an object' };
  }

  const stepId = data.stepId ?? data.step_id;
  const knowledgeUnitId = data.knowledgeUnitId ?? data.knowledge_unit_id;
  const linkType = data.linkType ?? data.link_type;

  if (!stepId || typeof stepId !== 'string') {
    return { valid: false, error: 'Missing or invalid stepId' };
  }
  if (!knowledgeUnitId || typeof knowledgeUnitId !== 'string') {
    return { valid: false, error: 'Missing or invalid knowledgeUnitId' };
  }
  
  return { valid: true, data: { stepId, knowledgeUnitId, linkType } };
}

```

### lib/validators/drill-validator.ts

```typescript
import type { DrillSession } from '@/types/drill'

export function validateDrillPayload(data: unknown): { valid: boolean; errors?: string[] } {
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid payload'] }
  }
  const d = data as Partial<DrillSession>
  const errors: string[] = []

  if (!d.ideaId || typeof d.ideaId !== 'string') errors.push('ideaId is required and must be a string')
  if (!d.intent || typeof d.intent !== 'string') errors.push('intent is required and must be a string')
  if (!d.successMetric || typeof d.successMetric !== 'string') errors.push('successMetric is required and must be a string')
  
  const validScopes = ['small', 'medium', 'large']
  if (!d.scope || !validScopes.includes(d.scope)) errors.push('scope must be small, medium, or large')

  const validPaths = ['solo', 'assisted', 'delegated']
  if (!d.executionPath || !validPaths.includes(d.executionPath)) errors.push('executionPath must be solo, assisted, or delegated')

  const validUrgencies = ['now', 'later', 'never']
  if (!d.urgencyDecision || !validUrgencies.includes(d.urgencyDecision)) errors.push('urgencyDecision must be now, later, or never')

  const validDispositions = ['arena', 'icebox', 'killed']
  if (!d.finalDisposition || !validDispositions.includes(d.finalDisposition)) errors.push('finalDisposition must be arena, icebox, or killed')

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

```

### lib/validators/experience-validator.ts

```typescript
import { 
  VALID_DEPTHS, 
  VALID_MODES, 
  VALID_TIME_SCOPES, 
  VALID_INTENSITIES,
  VALID_TRIGGERS,
  VALID_CONTEXT_SCOPES
} from '@/lib/contracts/resolution-contract'
import { validateStepPayload, ValidationResult } from './step-payload-validator'

/**
 * Validates a resolution object against the v1 canonical contract.
 */
export function validateResolution(resolution: any): ValidationResult {
  const errors: string[] = []

  if (!resolution || typeof resolution !== 'object') {
    return { valid: false, errors: ['resolution must be an object'] }
  }

  if (!VALID_DEPTHS.includes(resolution.depth)) {
    errors.push(`invalid depth: "${resolution.depth}" (must be ${VALID_DEPTHS.join('|')})`)
  }
  if (!VALID_MODES.includes(resolution.mode)) {
    errors.push(`invalid mode: "${resolution.mode}" (must be ${VALID_MODES.join('|')})`)
  }
  if (!VALID_TIME_SCOPES.includes(resolution.timeScope)) {
    errors.push(`invalid timeScope: "${resolution.timeScope}" (must be ${VALID_TIME_SCOPES.join('|')})`)
  }
  if (!VALID_INTENSITIES.includes(resolution.intensity)) {
    errors.push(`invalid intensity: "${resolution.intensity}" (must be ${VALID_INTENSITIES.join('|')})`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validates a reentry contract object against the v1 canonical contract.
 */
export function validateReentry(reentry: any): ValidationResult {
  const errors: string[] = []

  if (!reentry) return { valid: true, errors: [] } // null/undefined is allowed
  if (typeof reentry !== 'object') {
    return { valid: false, errors: ['reentry must be an object'] }
  }

  if (!VALID_TRIGGERS.includes(reentry.trigger)) {
    errors.push(`invalid reentry trigger: "${reentry.trigger}" (must be ${VALID_TRIGGERS.join('|')})`)
  }
  if (typeof reentry.prompt !== 'string' || reentry.prompt.length > 500) {
    errors.push('reentry prompt must be a string (max 500 chars)')
  }
  if (!VALID_CONTEXT_SCOPES.includes(reentry.contextScope)) {
    errors.push(`invalid reentry contextScope: "${reentry.contextScope}" (must be ${VALID_CONTEXT_SCOPES.join('|')})`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validates an experience creation payload against the v1 canonical contract.
 * Also performs structural normalization (e.g. step_type vs type).
 */
export function validateExperiencePayload(body: any): { valid: boolean; errors: string[]; normalized?: any } {
  const errors: string[] = []

  // 1. Required fields
  if (!body.templateId) errors.push('missing `templateId`')
  if (!body.userId) errors.push('missing `userId`')
  
  // 2. Resolution (required object)
  const resValid = validateResolution(body.resolution)
  if (!resValid.valid) errors.push(...resValid.errors.map(e => `resolution: ${e}`))

  // 3. Reentry (optional)
  const reValid = validateReentry(body.reentry)
  if (!reValid.valid) errors.push(...reValid.errors.map(e => `reentry: ${e}`))

  // 4. Strings (max length validation)
  if (body.title && (typeof body.title !== 'string' || body.title.length > 200)) {
    errors.push('title must be a string (max 200 chars)')
  }
  if (body.goal && (typeof body.goal !== 'string' || body.goal.length > 1000)) {
    errors.push('goal must be a string (max 1000 chars)')
  }
  if (body.urgency && !['low', 'medium', 'high'].includes(body.urgency)) {
    errors.push('invalid urgency: (must be "low" | "medium" | "high")')
  }

  // 5. Steps (normalization + validation)
  const normalizedSteps: any[] = []
  if (body.steps && Array.isArray(body.steps)) {
    body.steps.forEach((step: any, i: number) => {
      // Normalization: GPT sends `type`, internal uses `step_type`
      const stepType = step.step_type || step.type
      if (!stepType) {
        errors.push(`steps[${i}] missing \`step_type\` or \`type\``)
        return
      }

      // Payload validation
      const sValid = validateStepPayload(stepType, step.payload)
      if (!sValid.valid) {
        errors.push(...sValid.errors.map(e => `steps[${i}] (${stepType}): ${e}`))
      }

      normalizedSteps.push({
        step_type: stepType,
        title: step.title || '',
        payload: step.payload || {},
        completion_rule: step.completion_rule || null
      })
    })
  } else if (body.steps && !Array.isArray(body.steps)) {
    errors.push('`steps` must be an array')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  // Normalization for the rest of the object
  const normalized = {
    templateId: body.templateId,
    userId: body.userId,
    title: body.title || 'Untitled Experience',
    goal: body.goal || '',
    resolution: body.resolution,
    reentry: body.reentry || null,
    previousExperienceId: body.previousExperienceId || null,
    steps: normalizedSteps,
    urgency: body.urgency || 'low',
    generated_by: body.generated_by || null,
    source_conversation_id: body.source_conversation_id || null
  }

  return { valid: true, errors: [], normalized }
}

```

### lib/validators/goal-validator.ts

```typescript
import { GoalStatus, GOAL_STATUSES } from '@/lib/constants';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateGoal(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['payload must be an object'] };
  }

  if (typeof data.title !== 'string' || data.title.trim() === '') {
    errors.push('title must be a non-empty string');
  }

  if (data.status && !GOAL_STATUSES.includes(data.status)) {
    errors.push(`invalid status: "${data.status}" (must be one of ${GOAL_STATUSES.join(', ')})`);
  }

  if (data.domains !== undefined) {
    if (!Array.isArray(data.domains)) {
      errors.push('domains must be an array of strings');
    } else {
      for (const d of data.domains) {
        if (typeof d !== 'string') {
          errors.push('domains array must contain only strings');
          break;
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

```

### lib/validators/idea-validator.ts

```typescript
import type { Idea } from '@/types/idea'

export function validateIdeaPayload(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload' }
  }
  const d = data as Record<string, unknown>
  if (!d.title || typeof d.title !== 'string') {
    return { valid: false, error: 'Title is required' }
  }
  // Accept both camelCase (GPT sends) and snake_case (DB stores)
  const rawPrompt = d.rawPrompt || d.raw_prompt
  if (!rawPrompt || typeof rawPrompt !== 'string') {
    return { valid: false, error: 'Raw prompt is required' }
  }
  return { valid: true }
}

/**
 * Normalize an incoming idea payload to snake_case for the DB.
 * Accepts both camelCase (from GPT/API) and snake_case.
 */
export function normalizeIdeaPayload(data: Record<string, unknown>): Omit<Idea, 'id' | 'created_at' | 'status'> {
  return {
    title: data.title as string,
    raw_prompt: (data.rawPrompt || data.raw_prompt || '') as string,
    gpt_summary: (data.gptSummary || data.gpt_summary || '') as string,
    vibe: (data.vibe || 'unknown') as string,
    audience: (data.audience || 'unknown') as string,
    intent: (data.intent || '') as string,
  }
}

```

### lib/validators/knowledge-validator.ts

```typescript
import { MiraKWebhookPayload, MasteryStatus } from '@/types/knowledge';
import { KNOWLEDGE_UNIT_TYPES, MASTERY_STATUSES } from '@/lib/constants';

export function validateMiraKPayload(body: any): { valid: boolean; error?: string; data?: MiraKWebhookPayload } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Payload must be an object' };
  }

  if (!body.topic || typeof body.topic !== 'string') {
    return { valid: false, error: 'Missing or invalid topic' };
  }

  if (!body.domain || typeof body.domain !== 'string') {
    return { valid: false, error: 'Missing or invalid domain' };
  }

  if (!Array.isArray(body.units) || body.units.length === 0) {
    return { valid: false, error: 'Payload must contain a non-empty units array' };
  }

  for (const unit of body.units) {
    if (!KNOWLEDGE_UNIT_TYPES.includes(unit.unit_type)) {
      return { valid: false, error: `Invalid unit type: ${unit.unit_type}` };
    }
    if (!unit.title || typeof unit.title !== 'string') {
      return { valid: false, error: 'Unit missing title' };
    }
    if (!unit.thesis || typeof unit.thesis !== 'string') {
      return { valid: false, error: 'Unit missing thesis' };
    }
    if (!unit.content || typeof unit.content !== 'string') {
      return { valid: false, error: 'Unit missing content' };
    }
    if (!Array.isArray(unit.key_ideas)) {
      return { valid: false, error: 'Unit key_ideas must be an array' };
    }
  }

  if (body.experience_proposal) {
    const prop = body.experience_proposal;
    if (!prop.title || !prop.goal || !prop.template_id || !prop.resolution || !Array.isArray(prop.steps)) {
      // Don't reject the whole payload — strip the incomplete proposal and log
      console.warn('[knowledge-validator] Incomplete experience_proposal — stripping it. Missing fields:', {
        title: !!prop.title, goal: !!prop.goal, template_id: !!prop.template_id,
        resolution: !!prop.resolution, steps: Array.isArray(prop.steps)
      });
      delete body.experience_proposal;
    }
  }

  if (body.session_id && typeof body.session_id !== 'string') {
    return { valid: false, error: 'Invalid session_id' };
  }

  return { valid: true, data: body as MiraKWebhookPayload };
}

export function validateMasteryUpdate(body: any): { valid: boolean; error?: string; data?: { mastery_status: MasteryStatus } } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Payload must be an object' };
  }

  const { mastery_status } = body;
  if (!MASTERY_STATUSES.includes(mastery_status)) {
    return { valid: false, error: `Invalid mastery status: ${mastery_status}` };
  }

  return { valid: true, data: { mastery_status } };
}

```

### lib/validators/project-validator.ts

```typescript
import type { Project } from '@/types/project'

export function validateProjectPayload(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload' }
  }
  const d = data as Partial<Project>
  if (!d.name) return { valid: false, error: 'name is required' }
  if (!d.ideaId) return { valid: false, error: 'ideaId is required' }
  return { valid: true }
}

```

### lib/validators/step-payload-validator.ts

```typescript
import { 
  CONTRACTED_STEP_TYPES, 
  ContractedStepType,
  isContractedStepType
} from '@/lib/contracts/step-contracts'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validates a step payload against the v1 canonical contract.
 * Follows the "strict fields, additive allowed" and "unknown type pass-through" policies.
 */
export function validateStepPayload(stepType: string, payload: any): ValidationResult {
  const errors: string[] = []

  // Unknown types pass validation (UNKNOWN_STEP_POLICY)
  if (!isContractedStepType(stepType)) {
    console.warn(`[Validator] Unknown step type "${stepType}" passed through.`)
    return { valid: true, errors: [] }
  }

  // Version check (additive strategy)
  const version = payload?.v || 1
  if (version > 1) {
    // Current validators only know v1. 
    // If it's a future version, we pass it through to let future renderers handle it.
    console.warn(`[Validator] Future payload version ${version} for "${stepType}" passed through.`)
    return { valid: true, errors: [] }
  }

  // Contracted v1 validation
  switch (stepType) {
    case 'questionnaire':
      if (!Array.isArray(payload?.questions)) {
        errors.push('missing `questions` array')
      } else {
        payload.questions.forEach((q: any, i: number) => {
          if (!q.id) errors.push(`questions[${i}] missing \`id\``)
          if (!q.label) errors.push(`questions[${i}] missing \`label\` (renderer uses label, not text)`)
          if (!['text', 'choice', 'scale'].includes(q.type)) {
            errors.push(`questions[${i}] invalid \`type\` (must be text|choice|scale)`)
          }
          if (q.type === 'choice' && !Array.isArray(q.options)) {
            errors.push(`questions[${i}] choice type requires \`options\` array`)
          }
        })
      }
      break

    case 'lesson':
      if (!Array.isArray(payload?.sections)) {
        errors.push('missing `sections` array (renderer uses sections, not content)')
      } else {
        payload.sections.forEach((s: any, i: number) => {
          if (!s.heading && !s.body) {
            errors.push(`sections[${i}] needs at least \`heading\` or \`body\``)
          }
          if (s.type && !['text', 'callout', 'checkpoint'].includes(s.type)) {
            errors.push(`sections[${i}] invalid \`type\` (must be text|callout|checkpoint)`)
          }
        })
      }
      break

    case 'reflection':
      if (!Array.isArray(payload?.prompts)) {
        errors.push('missing `prompts` array (renderer uses prompts[], not prompt string)')
      } else {
        payload.prompts.forEach((p: any, i: number) => {
          if (!p.id) errors.push(`prompts[${i}] missing \`id\``)
          if (!p.text) errors.push(`prompts[${i}] missing \`text\``)
        })
      }
      break

    case 'challenge':
      if (!Array.isArray(payload?.objectives)) {
        errors.push('missing `objectives` array')
      } else {
        payload.objectives.forEach((o: any, i: number) => {
          if (!o.id) errors.push(`objectives[${i}] missing \`id\``)
          if (!o.description) errors.push(`objectives[${i}] missing \`description\``)
        })
      }
      break

    case 'plan_builder':
      if (!Array.isArray(payload?.sections)) {
        errors.push('missing `sections` array')
      } else {
        payload.sections.forEach((s: any, i: number) => {
          if (!['goals', 'milestones', 'resources'].includes(s.type)) {
            errors.push(`sections[${i}] invalid \`type\` (must be goals|milestones|resources)`)
          }
          if (!Array.isArray(s.items)) {
            errors.push(`sections[${i}] missing \`items\` array`)
          } else {
            s.items.forEach((item: any, j: number) => {
              if (!item.id) errors.push(`sections[${i}].items[${j}] missing \`id\``)
              if (!item.text) errors.push(`sections[${i}].items[${j}] missing \`text\``)
            })
          }
        })
      }
      break

    case 'essay_tasks':
      if (typeof payload?.content !== 'string') {
        errors.push('missing `content` string')
      }
      if (!Array.isArray(payload?.tasks)) {
        errors.push('missing `tasks` array')
      } else {
        payload.tasks.forEach((t: any, i: number) => {
          if (!t.id) errors.push(`tasks[${i}] missing \`id\``)
          if (!t.description) errors.push(`tasks[${i}] missing \`description\``)
        })
      }
      break
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

```

### lib/validators/webhook-validator.ts

```typescript
import type { WebhookPayload } from '@/types/webhook'

export function validateGitHubWebhookHeaders(headers: Headers): { valid: boolean; error?: string } {
  const event = headers.get('x-github-event')
  if (!event) return { valid: false, error: 'Missing x-github-event header' }
  
  // Signature is typically required in prod, but optional if SECRET not set in dev
  // We'll let the route handle the actual check vs secret
  return { valid: true }
}

export function validateWebhookPayload(data: unknown): { valid: boolean; error?: string } {

  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload' }
  }
  const d = data as Partial<WebhookPayload>
  if (!d.source) return { valid: false, error: 'source is required' }
  if (!d.event) return { valid: false, error: 'event is required' }
  return { valid: true }
}

```

### lib/view-models/arena-view-model.ts

```typescript
import type { Project } from '@/types/project'
import type { Task } from '@/types/task'
import type { PullRequest } from '@/types/pr'

export interface ArenaViewModel {
  project: Project
  tasks: Task[]
  prs: PullRequest[]
  openPRCount: number
  blockedTaskCount: number
  donePct: number
}

export function buildArenaViewModel(
  project: Project,
  tasks: Task[],
  prs: PullRequest[]
): ArenaViewModel {
  const done = tasks.filter((t) => t.status === 'done').length
  const blocked = tasks.filter((t) => t.status === 'blocked').length
  const donePct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
  const openPRs = prs.filter((pr) => pr.status === 'open').length

  return {
    project,
    tasks,
    prs,
    openPRCount: openPRs,
    blockedTaskCount: blocked,
    donePct,
  }
}

```

### lib/view-models/icebox-view-model.ts

```typescript
import type { Idea } from '@/types/idea'
import type { Project } from '@/types/project'
import { daysSince } from '@/lib/date'
import { STALE_ICEBOX_DAYS } from '@/lib/constants'

export interface IceboxItem {
  type: 'idea' | 'project'
  id: string
  title: string
  summary: string
  daysInIcebox: number
  isStale: boolean
  createdAt: string
}

export function buildIceboxViewModel(ideas: Idea[], projects: Project[]): IceboxItem[] {
  const iceboxIdeas: IceboxItem[] = ideas
    .filter((i) => i.status === 'icebox')
    .map((i) => ({
      type: 'idea',
      id: i.id,
      title: i.title,
      summary: i.gpt_summary,
      daysInIcebox: daysSince(i.created_at),
      isStale: daysSince(i.created_at) >= STALE_ICEBOX_DAYS,
      createdAt: i.created_at,
    }))

  const iceboxProjects: IceboxItem[] = projects
    .filter((p) => p.state === 'icebox')
    .map((p) => ({
      type: 'project',
      id: p.id,
      title: p.name,
      summary: p.summary,
      daysInIcebox: daysSince(p.updatedAt),
      isStale: daysSince(p.updatedAt) >= STALE_ICEBOX_DAYS,
      createdAt: p.updatedAt,
    }))

  return [...iceboxIdeas, ...iceboxProjects].sort(
    (a, b) => b.daysInIcebox - a.daysInIcebox
  )
}

```

### lib/view-models/inbox-view-model.ts

```typescript
import type { InboxEvent } from '@/types/inbox'

export interface InboxViewModel {
  events: InboxEvent[]
  unreadCount: number
  errorCount: number
}

export function buildInboxViewModel(events: InboxEvent[]): InboxViewModel {
  return {
    events,
    unreadCount: events.filter((e) => !e.read).length,
    errorCount: events.filter((e) => e.severity === 'error').length,
  }
}

```

### lib/view-models/review-view-model.ts

```typescript
import type { PullRequest, ReviewStatus } from '@/types/pr'
import type { Project } from '@/types/project'

export interface ReviewViewModel {
  pr: PullRequest
  project?: Project
  canMerge: boolean
  reviewState: ReviewStatus
}

export function buildReviewViewModel(pr: PullRequest, project?: Project): ReviewViewModel {
  let reviewState: ReviewStatus = 'pending'

  if (pr.status === 'merged') {
    reviewState = 'merged'
  } else if (pr.reviewStatus) {
    reviewState = pr.reviewStatus
  } else if (pr.requestedChanges) {
    reviewState = 'changes_requested'
  }

  return {
    pr,
    project,
    canMerge: pr.status === 'open' && pr.buildState === 'success' && pr.mergeable,
    reviewState,
  }
}

```

### .github/copilot-instructions.md

```markdown
# Copilot instructions for the Mira Studio repository.
# The coding agent reads this file for context when working on issues.

## Project Overview
Mira Studio is a Next.js 14 (App Router) application for managing ideas
from capture through execution. TypeScript strict mode, Tailwind CSS.

## Key Conventions
- All services read/write through `lib/storage.ts` to `.local-data/studio.json`
- Client components use `fetch()` to call API routes — never import services directly
- GitHub operations go through `lib/adapters/github-adapter.ts`
- UI copy comes from `lib/studio-copy.ts`
- Routes are centralized in `lib/routes.ts`

## File Structure
- `app/` — Next.js pages and API routes
- `components/` — React components
- `lib/` — Services, adapters, utilities
- `types/` — TypeScript type definitions

## Testing
- `npx tsc --noEmit` for type checking
- `npm run build` for production build verification

```

### agents.md

```markdown
# Mira Studio — Agent Context

> Standing context for any agent entering this repo. Not sprint-specific.

---

## Product Summary

Mira is an experience engine disguised as a studio. Users talk to a Custom GPT ("Mira"), which proposes typed **Experiences** — structured modules the user lives through inside the app. Experiences can be persistent (go through a review pipeline) or ephemeral (injected instantly). A coding agent *realizes* these experiences against typed schemas and pushes them through GitHub. The frontend renders experiences from schema, not from hardcoded pages.

**Core entities:**
- **Experience** — the central noun. Can be a questionnaire, lesson, challenge, plan builder, reflection, or essay+tasks.
- **Realization** — the internal build object (replaces "project" for code-execution contexts). Maps to GitHub issues/PRs.
- **Resolution** — typed object on every experience controlling depth, mode, time scope, and intensity.
- **Re-entry Contract** — per-experience hook that defines how GPT re-enters with awareness.

**Two parallel truths:**
- Runtime truth lives in Supabase (what the user did)
- Realization truth lives in GitHub (what the coder built)

**Local development model:** The user is the local dev. API endpoints are the same contract the Custom GPT hits in production. In local mode, ideas are entered via `/dev/gpt-send` harness. JSON file fallback requires explicit `USE_JSON_FALLBACK=true` in `.env.local` — see SOP-15. Dev harnesses exist at `/api/dev/diagnostic` (adapter/env/counts) and `/api/dev/test-experience` (creates test ephemeral + persistent).

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3.4, dark studio theme |
| Database | Supabase (Postgres) — canonical runtime store |
| Fallback data | JSON file storage under `.local-data/` (explicit opt-in only via `USE_JSON_FALLBACK=true`) |
| State logic | `lib/state-machine.ts` — idea + project + experience + PR transition tables |
| Copy/Labels | `lib/studio-copy.ts` — centralized UI copy |
| Routing | `lib/routes.ts` — centralized route map |
| GitHub | `@octokit/rest` via `lib/adapters/github-adapter.ts` |
| Supabase | `@supabase/supabase-js` via `lib/supabase/client.ts` |
| AI Intelligence | Genkit + `@genkit-ai/google-genai` via `lib/ai/genkit.ts` |
| Research Engine | **MiraK** — Python/FastAPI microservice on Cloud Run (`c:/mirak` repo) |

### MiraK Microservice (Separate Repo: `c:/mirak`)

MiraK is a Python/FastAPI research agent that runs as a Cloud Run microservice. It is a **separate project** from Mira Studio but deeply integrated via webhooks.

| Layer | Tech |
|-------|------|
| Framework | FastAPI (Python 3.11+) |
| AI Agents | Google ADK (Agent Development Kit) |
| Deployment | Google Cloud Run |
| Endpoint | `POST /generate_knowledge` |
| Cloud URL | `https://mirak-528663818350.us-central1.run.app` |
| GPT Action | `mirak_gpt_action.yaml` (OpenAPI schema in `c:/mirak/`) |

**Architecture:**
```
Custom GPT → POST /generate_knowledge (Cloud Run)
  ↓ 202 Accepted (immediate)
  ↓ BackgroundTasks: agent pipeline runs
  ↓ On completion: webhook delivery
  ↓
  ├── Primary: https://mira.mytsapi.us/api/webhook/mirak (local tunnel)
  └── Fallback: https://mira-maddyup.vercel.app/api/webhook/mirak (production)
  ↓
Mira Studio webhook receiver validates + persists to Supabase:
  ├── knowledge_units table (the research content)
  └── experience_instances table (enriches existing if experience_id present)
```

**Key files in `c:/mirak`:**
- `main.py` — FastAPI app, `/generate_knowledge` endpoint, agent pipeline, webhook delivery
- `knowledge.md` — Writing guide for content quality (NOT a schema constraint)
- `mirak_gpt_action.yaml` — OpenAPI schema for the Custom GPT Action
- `Dockerfile` — Cloud Run container definition
- `requirements.txt` — Python dependencies

**Webhook routing logic (in `main.py`):**
1. Tries local tunnel diagnostic check (`GET /api/dev/diagnostic`)
2. If local is up → delivers to local tunnel
3. If local is down → delivers to Vercel production URL
4. Authentication via `MIRAK_WEBHOOK_SECRET` header (`x-mirak-secret`)

**Environment variables (both repos must share):**
- `MIRAK_WEBHOOK_SECRET` in `c:/mira/.env.local` AND `c:/mirak/.env`

**MiraK-specific env (in `c:/mirak/.env` only):**
- `GEMINI_SEARCH` — Dedicated API key for MiraK's ADK agents. Do NOT rename this var. See `c:/mirak/AGENTS.md` for full context.

**Cloud Run deployment requires `--set-env-vars` to inject secrets and `--no-cpu-throttling` for background tasks.** See `c:/mirak/AGENTS.md` for deploy commands.

---

## Repo File Map

```
app/
  page.tsx              ← Home / dashboard (attention cockpit)
  layout.tsx            ← Root layout (html, body, globals.css)
  globals.css           ← CSS custom props + tailwind directives
  send/page.tsx         ← Incoming ideas from GPT (shows all captured ideas)
  drill/page.tsx        ← 6-step idea clarification tunnel (client component)
  drill/success/        ← Post-drill success screen
  drill/end/            ← Post-drill kill screen
  arena/page.tsx        ← Active projects list
  arena/[projectId]/    ← Single project detail (3-pane)
  review/[prId]/page.tsx← PR review page (preview-first)
  inbox/page.tsx        ← Events feed (filterable, mark-read)
  icebox/page.tsx       ← Deferred ideas + projects
  shipped/page.tsx      ← Completed projects
  killed/page.tsx       ← Removed projects
  library/              ← Experience library (Active, Completed, Moments, Suggested)
    page.tsx            ← Server component: fetches + groups experiences
    LibraryClient.tsx   ← Client component: "Accept & Start" actions
  workspace/            ← Lived experience surface
    [instanceId]/
      page.tsx          ← Server component: fetch instance + steps
      WorkspaceClient.tsx ← Client component: renders ExperienceRenderer
  dev/
    gpt-send/page.tsx   ← Dev harness: simulate GPT sending an idea
    github-playground/  ← Dev harness: test GitHub operations
  api/
    dev/
      diagnostic/       ← GET dev-only: adapter, env, row counts, quarantined surfaces
      test-experience/  ← POST dev-only: creates ephemeral + persistent for DEFAULT_USER_ID
    gpt/                 ← GPT Gateway (compound endpoints — Sprint 10)
      state/route.ts     ← GET: compressed user state for re-entry
      plan/route.ts      ← POST: curriculum outlines, research dispatch, gap analysis
      create/route.ts    ← POST: experiences, ideas, steps (discriminated by type)
      update/route.ts    ← POST: step edits, reorder, transitions (discriminated by action)
      discover/route.ts  ← GET: progressive disclosure — returns schemas + examples by capability
    coach/               ← Coach API (frontend-facing inline tutor — Sprint 10)
      chat/route.ts      ← POST: contextual tutor Q&A within active step (Genkit tutorChatFlow)
      grade/route.ts     ← POST: semantic checkpoint grading (Genkit gradeCheckpointFlow)
      grade-batch/route.ts ← POST: batch checkpoint grading (multiple questions)
      mastery/route.ts   ← POST: evidence-based mastery assessment
    goals/               ← Goal CRUD (Sprint 13)
      route.ts           ← GET (list) / POST (create goal)
      [id]/route.ts      ← GET/PATCH single goal
    skills/              ← Skill Domain CRUD (Sprint 13)
      route.ts           ← GET (list) / POST (create domain)
      [id]/route.ts      ← GET/PATCH single domain (link_unit, link_experience, recompute_mastery)
    knowledge/           ← Knowledge CRUD
      route.ts           ← GET (list)
      [id]/route.ts      ← GET single unit
      batch/route.ts     ← GET batch units by IDs
    ideas/route.ts       ← GET/POST ideas
    ideas/materialize/   ← POST convert idea→project
    drill/route.ts       ← POST save drill session
    projects/route.ts    ← GET projects
    tasks/route.ts       ← GET tasks by project
    prs/route.ts         ← GET/PATCH PRs by project
    inbox/route.ts       ← GET/PATCH inbox events
    experiences/         ← Experience CRUD + inject (frontend-facing, still active)
      route.ts           ← GET (list) / POST (create persistent)
      inject/route.ts    ← POST (create ephemeral — GPT direct-create)
      [id]/route.ts      ← GET single experience (enriched with graph + interactions)
      [id]/steps/route.ts ← GET/POST steps for an experience
      [id]/chain/route.ts ← GET/POST experience chaining
      [id]/suggestions/   ← GET next-experience suggestions
    interactions/        ← Event telemetry
    synthesis/           ← Compressed state for GPT
    actions/
      promote-to-arena/  ← POST
      move-to-icebox/    ← POST
      mark-shipped/      ← POST
      kill-idea/         ← POST
      merge-pr/          ← POST
    github/              ← GitHub-specific API routes
      test-connection/   ← GET  validate token + repo access
      create-issue/      ← POST create GitHub issue from project
      create-pr/         ← POST create GitHub PR
      dispatch-workflow/ ← POST trigger GitHub Actions workflow
      sync-pr/           ← GET/POST sync PRs from GitHub
      merge-pr/          ← POST merge real GitHub PR
      trigger-agent/     ← POST trigger Copilot agent
    webhook/
      gpt/route.ts       ← GPT webhook receiver (used by dev harness locally)
      github/route.ts    ← GitHub webhook receiver (real: signature-verified)
      vercel/route.ts    ← Vercel webhook receiver (stub)
      mirak/route.ts     ← MiraK research webhook receiver

components/
  shell/                 ← AppShell, StudioSidebar, StudioHeader, MobileNav, CommandBar
  common/                ← EmptyState, StatusBadge, TimePill, ConfirmDialog, etc.
  send/                  ← CapturedIdeaCard, DefineInStudioHero, IdeaSummaryPanel
  drill/                 ← DrillLayout, DrillProgress, GiantChoiceButton, MaterializationSequence
  arena/                 ← ArenaProjectCard, ActiveLimitBanner, PreviewFrame, ProjectPanes, etc.
  review/                ← SplitReviewLayout, PRSummaryCard, DiffSummary, BuildStatusChip, etc.
  inbox/                 ← InboxFeed, InboxEventCard, InboxFilterTabs
  icebox/                ← IceboxCard, StaleIdeaModal, TriageActions
  archive/               ← TrophyCard, GraveyardCard, ArchiveFilterBar
  experience/            ← ExperienceRenderer, ExperienceCard, HomeExperienceAction,
                           StepNavigator, ExperienceOverview, DraftProvider,
                           step renderers (Questionnaire, Lesson, Challenge, PlanBuilder,
                           Reflection, EssayTasks, CheckpointStep)
                           KnowledgeCompanion (evolves → TutorChat mode)
                           CompletionScreen (synthesis-driven completion UI)
                           CoachTrigger (proactive coaching: failed checkpoint, dwell, unread)
                           StepKnowledgeCard (pre/in/post timing knowledge delivery)
                           TrackCard, TrackSection (curriculum outline UI)
  knowledge/             ← KnowledgeUnitCard, KnowledgeUnitView, MasteryBadge, DomainCard
  skills/                ← SkillTreeCard, SkillTreeGrid (Sprint 13)
  common/                ← EmptyState, StatusBadge, TimePill, ConfirmDialog, DraftIndicator,
                           FocusTodayCard (home page resume link),
                           ResearchStatusBadge (MiraK research arrival indicator)
  timeline/              ← TimelineEventCard, TimelineFilterBar
  profile/               ← FacetCard, DirectionSummary
  dev/                   ← GPT send form, dev tools

lib/
  config/
    github.ts            ← GitHub env config, validation, repo coordinates
  contracts/
    experience-contract.ts ← v1 experience instance contract + module roles
    step-contracts.ts      ← v1 per-type step payload contracts + unions
    resolution-contract.ts ← v1 resolution + re-entry contracts + chrome mapping
  gateway/               ← GPT Gateway layer (Sprint 10)
    discover-registry.ts   ← Capability → schema + example map for /api/gpt/discover
    gateway-router.ts      ← Action/type discriminator + dispatch logic
    gateway-types.ts       ← GatewayRequest, DiscoverResponse types
  github/
    client.ts            ← Octokit wrapper, getGitHubClient()
    signature.ts         ← HMAC-SHA256 webhook signature verification
    handlers/            ← Per-event webhook handlers (issue, PR, workflow, review)
  supabase/
    client.ts            ← Server-side Supabase client
    browser.ts           ← Browser-side Supabase client
    migrations/          ← SQL migration files (001–006+)
  ai/
    genkit.ts            ← Genkit initialization + Google AI plugin
    schemas.ts           ← Shared Zod schemas for AI flow outputs
    safe-flow.ts         ← Graceful degradation wrapper for AI flows
    flows/               ← Genkit flow definitions (one file per flow)
      synthesize-experience.ts  ← narratize synthesis on experience completion
      suggest-next-experience.ts← context-aware next-experience suggestions
      extract-facets.ts         ← semantic profile facet extraction
      compress-gpt-state.ts     ← token-efficient GPT state compression
      refine-knowledge-flow.ts  ← knowledge enrichment (retrieval Qs, cross-links)
      tutor-chat-flow.ts        ← contextual Q&A within a step [NEW]
      grade-checkpoint-flow.ts  ← semantic grading of checkpoint answers [NEW]
    context/             ← Context assembly helpers for flows
      suggestion-context.ts  ← Gathers user profile + history for suggestions
      facet-context.ts       ← Flattens interactions for facet extraction
  experience/
    renderer-registry.tsx← Step renderer registry (maps step_type → component)
    reentry-engine.ts    ← Re-entry contract evaluation (completion + inactivity triggers)
    interaction-events.ts← Event type constants + payload builder
    progression-engine.ts← Step scoring + friction calculator
    progression-rules.ts ← Canonical experience chain map + suggestion logic
    step-state-machine.ts← Step status transitions (pending → in_progress → completed)
    step-scheduling.ts   ← Pacing utilities (daily/weekly/custom scheduling)
    skill-mastery-engine.ts ← Mastery computation (evidence thresholds for 6 levels)
    CAPTURE_CONTRACT.md  ← Interaction capture spec for 7 event types
  hooks/
    useInteractionCapture.ts ← Fire-and-forget telemetry hook
    useDraftPersistence.ts   ← Debounced auto-save + hydration hook for step drafts
  storage.ts             ← JSON file read/write for .local-data/ (atomic writes)
  storage-adapter.ts     ← Adapter interface: Supabase primary, JSON fallback
  seed-data.ts           ← Initial seed records (legacy JSON)
  state-machine.ts       ← Idea + project + experience + PR transition rules
  studio-copy.ts         ← Central copy strings for all pages
  constants.ts           ← MAX_ARENA_PROJECTS, DRILL_STEPS, execution modes, experience classes, resolution constants, DEFAULT_USER_ID, DEFAULT_TEMPLATE_IDS
  routes.ts              ← Centralized route paths (including workspace, library, timeline, profile)
  guards.ts              ← Type guards (isExperienceInstance, isValidResolution, etc.)
  utils.ts               ← generateId helper (UUID via crypto.randomUUID)
  date.ts                ← Date formatting
  services/              ← ideas, projects, tasks, prs, inbox, drill, materialization,
                           agent-runs, external-refs, github-factory, github-sync,
                           experience, interaction, synthesis, graph, timeline, facet,
                           draft, knowledge, curriculum-outline, goal, skill-domain,
                           home-summary services
  adapters/              ← github (real Octokit client), gpt, vercel, notifications
  formatters/            ← idea, project, pr, inbox formatters
  validators/            ← idea, project, drill, webhook, experience, step-payload, knowledge, goal validators
  view-models/           ← arena, icebox, inbox, review VMs

types/
  idea.ts, project.ts, task.ts, pr.ts, drill.ts, inbox.ts, webhook.ts, api.ts,
  agent-run.ts, external-ref.ts, github.ts,
  experience.ts, interaction.ts, synthesis.ts,
  graph.ts, timeline.ts, profile.ts,
  knowledge.ts           ← KnowledgeUnit, KnowledgeProgress, MiraKWebhookPayload
  curriculum.ts          ← CurriculumOutline, StepKnowledgeLink
  goal.ts                ← Goal, GoalRow, GoalStatus (Sprint 13)
  skill.ts               ← SkillDomain, SkillDomainRow, SkillMasteryLevel (Sprint 13)

content/                 ← Product copy markdown
docs/
  contracts/             ← v1 experience contract docs
enrichment.md            ← Master thesis: 3-pillar enrichment strategy

.local-data/             ← JSON file persistence (gitignored, auto-seeded)
roadmap.md               ← Product roadmap (experience engine evolution)
wiring.md                ← Manual setup steps for the user (env vars, webhooks, etc.)
```

---

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server (next dev)
npm run build        # production build (next build)
npm run lint         # eslint
npx tsc --noEmit     # type check
```

---

## Common Pitfalls

### Data persistence has two backends (fail-fast, not silent fallback)
`lib/storage.ts` is the legacy JSON file store. Supabase is the primary backend via `lib/storage-adapter.ts`. All services call through the adapter interface. If Supabase is not configured, the adapter **throws an error** instead of silently falling back. To use JSON locally, set `USE_JSON_FALLBACK=true` in `.env.local`. **Do not** call `fs` directly from services — always go through the adapter.

### Next.js 14 caches all `fetch()` calls by default — including Supabase
`@supabase/supabase-js` uses `fetch()` internally. Next.js App Router patches `fetch()` and caches responses by default. **If you don't add `cache: 'no-store'` to the Supabase client's global fetch override, server components will serve stale data.** The fix is in `lib/supabase/client.ts` — `global.fetch` wrapper passes `cache: 'no-store'`. Do NOT remove this. `force-dynamic` on a page does NOT disable fetch-level caching.

### Legacy entity services are quarantined
`projects-service.ts` and `prs-service.ts` return empty arrays with warnings. The underlying Supabase tables (`realizations`, `realization_reviews`) exist but use snake_case columns (`idea_id`, `current_phase`) while the TypeScript types use camelCase (`ideaId`, `currentPhase`). They are intentionally quarantined until a proper schema migration aligns them. Arena, Review, Icebox, Shipped, and Killed pages show empty as a result.

### Ephemeral experiences start in `injected` status
Unlike persistent experiences which start in `proposed`, ephemeral experiences injected via API start as `injected`. Both must reach `active` status before they can transition to `completed`. `ExperienceRenderer` now handles this by auto-triggering the `start` (ephemeral) or `activate` (persistent) transition on mount if the experience is in its initial terminal status.

### LessonStep expects `sections` array, not `content` string
The `LessonStep` renderer does NOT support raw markdown strings. It requires a `payload.sections` array of `{ heading, body, type }`. If an agent sends a single `content` blob, the lesson will render as empty.

### Synthesis Loop Automation
State synthesis (generating insights for GPT) is not automated in the backend. `ExperienceRenderer` must explicitly call `POST /api/synthesis` with `userId`, `sourceType`, and `sourceId` upon experience completion to ensure the `gpt/state` packet contains the latest user insights.

### Drill page is a client component
`app/drill/page.tsx` is `'use client'`. It must use `fetch()` to call API routes. It cannot import server-side services directly.

### All data mutations must go through API routes
Client components call `/api/*` endpoints. Server components can import services directly. This ensures the same contract works for both the UI and the Custom GPT.

### The central noun is Experience, not PR
The user-facing language is "Approve Experience" / "Publish", not "Merge PR". Internally a realization may map to a PR, but the UI never exposes that. See `roadmap.md` for the full approval language table.

### GitHub adapter is a real Octokit client
`lib/adapters/github-adapter.ts` is a full provider boundary using `@octokit/rest`. All GitHub operations go through this adapter. If GitHub is not configured (no token), the app degrades gracefully to local-only mode.

### GitHub webhook route verifies signatures
The GitHub webhook (`app/api/webhook/github/route.ts`) uses HMAC-SHA256 to verify payloads. Requires `GITHUB_WEBHOOK_SECRET` in `.env.local`.

### `studio-copy.ts` is the single source for UI labels
All user-facing text should come from this file. Some pages still hardcode strings — fix them when you see them.

### Route naming vs. internal naming
Code uses "arena" / "icebox" / "killed" / "shipped" internally. The UI should present these in friendlier terms: "In Progress" / "On Hold" / "Removed" / "Shipped".

### Experience has two instance types
`persistent` = goes through proposal → review → publish pipeline.
`ephemeral` = GPT creates directly via `/api/experiences/inject`, renders instantly, skips review.

### Resolution object is mandatory on all experience instances
Every experience carries a `resolution` JSONB field: `{ depth, mode, timeScope, intensity }`. This controls renderer chrome, coder spec shape, and GPT entry mode. Never create an experience instance without a resolution.

### Persistent experiences use the same schema as ephemeral
They share the same `experience_instances` table, same step structure, same renderer, same interaction model. The only differences are lifecycle (proposed → active) and visibility (shows in library, can be revisited). Do NOT create a second system for persistent experiences.

### Review is an illusion layer in Sprint 4
Approve/Publish are UI buttons that transition experience status. They do NOT wire to real GitHub PR logic. Do not deepen GitHub integration for experiences.

### Resolution must visibly affect UX
`light` → minimal chrome (no header, no progress bar, clean immersive step only).
`medium` → progress bar + step title.
`heavy` → full header with goal, progress, description.
If resolution doesn't visibly change the UI → it's dead weight.

### UUID-style IDs everywhere
All IDs use `crypto.randomUUID()` via `lib/utils.ts`. No prefixed IDs (`exp-`, `step-`, etc.). This ensures clean DB alignment and easier joins.

### DEFAULT_USER_ID for development
Single-user dev mode uses `DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000001'` from `lib/constants.ts`. No auth system exists yet — all API routes use this ID.

### Supabase project is live
Project ID: `bbdhhlungcjqzghwovsx`. 18 tables exist (including `curriculum_outlines` and `step_knowledge_links` from migration 007). Dev user and 6 templates are seeded.

### Inbox uses `timeline_events` with normalization
`inbox-service.ts` reads/writes to the `timeline_events` Supabase table, which uses snake_case (`project_id`, `action_url`, `github_url`). The service has `fromDB()`/`toDB()` normalization functions that map to/from the camelCase TypeScript `InboxEvent` type. Always go through the service, never query `timeline_events` directly.

### Seeded template IDs use `b0000000-` prefix
Experience templates are seeded with IDs like `b0000000-0000-0000-0000-000000000001` through `...000006`. If you create test experiences, use these IDs — foreign key constraints will reject any template_id that doesn't exist in `experience_templates`.

### `gptschema.md` documents the GPT API contract
All API response fields for the `Idea` entity use **snake_case** (`raw_prompt`, `gpt_summary`, `created_at`). The `CaptureIdeaRequest` accepts **both** camelCase and snake_case — the `normalizeIdeaPayload` function in `idea-validator.ts` handles both. If you change API response shapes, update `gptschema.md` to match.

---

## SOPs

### SOP-1: Always use `lib/routes.ts` for navigation
**Learned from**: Initial scaffolding

- ❌ `href="/arena"` (hardcoded)
- ✅ `href={ROUTES.arena}` (centralized)

### SOP-2: All UI copy goes through `lib/studio-copy.ts`
**Learned from**: Sprint 1 UX audit

- ❌ `<h1>Trophy Room</h1>` (inline string)
- ✅ `<h1>{COPY.shipped.heading}</h1>` (centralized copy)

### SOP-3: State transitions go through `lib/state-machine.ts`
**Learned from**: Initial architecture

- ❌ Manually setting `idea.status = 'arena'` in a page
- ✅ Use `getNextIdeaState(idea.status, 'commit_to_arena')` to validate transition

### SOP-4: Never push/pull from git
**Learned from**: Multi-agent coordination

- ❌ `git push`, `git pull`, `git merge`
- ✅ Only modify files. Coordinator handles version control.

### SOP-5: All data mutations go through API routes
**Learned from**: GPT contract compatibility

- ❌ Calling `updateIdeaStatus()` directly from a client component
- ✅ `fetch('/api/actions/kill-idea', { method: 'POST', body: ... })`
- Why: The custom GPT will hit the same `/api/*` endpoints. The UI must exercise the same contract.

### SOP-6: Use `lib/storage.ts` (or adapter) for all persistence
**Learned from**: In-memory data loss on server restart

- ❌ `const ideas: Idea[] = [...MOCK_IDEAS]` (module-level array, lost on restart)
- ✅ `const ideas = storage.read('ideas')` (reads from persistent store)
- Why: Data must survive server restarts. The storage adapter handles backend selection.

### SOP-7: GitHub operations go through the adapter, never raw Octokit
**Learned from**: Sprint 2 architecture

- ❌ `const octokit = new Octokit(...)` in a route handler
- ✅ `import { createIssue } from '@/lib/adapters/github-adapter'`
- Why: The adapter is the auth boundary. When migrating from PAT to GitHub App, only `lib/github/client.ts` changes.

### SOP-8: Don't call the adapter from routes — use services
**Learned from**: Sprint 2 architecture

- ❌ `import { createIssue } from '@/lib/adapters/github-adapter'` in a route
- ✅ `import { createIssueFromProject } from '@/lib/services/github-factory-service'`
- Why: Services orchestrate: load data → call adapter → update records → create events. Routes stay thin.

### SOP-9: Supabase operations go through services, never raw client calls in routes
**Learned from**: Sprint 3 architecture

- ❌ `const { data } = await supabase.from('experience_instances').select('*')` in a route handler
- ✅ `import { getExperienceInstances } from '@/lib/services/experience-service'`
- Why: Same principle as SOP-8. Services own the query logic; routes are thin dispatch layers.

### SOP-10: Every experience instance must carry a resolution object
**Learned from**: Sprint 3 architecture

- ❌ Creating an experience_instance with no resolution field
- ✅ Always include `resolution: { depth, mode, timeScope, intensity }` — even for ephemeral
- Why: Resolution controls renderer chrome, coder spec shape, and GPT entry behavior. Without it, the system drifts.

### SOP-11: Persistent is a boring clone of ephemeral — not a second system
**Learned from**: Sprint 3 → Sprint 4 transition

- ❌ Creating separate tables, renderers, or interaction models for persistent experiences
- ✅ Same schema, same renderer, same interaction model. Only lifecycle (proposed → active) and library visibility differ.
- Why: Two systems = drift. One schema rendered two ways = coherent system.

### SOP-12: Do not deepen GitHub integration for experiences
**Learned from**: Sprint 4 architecture decision

- ❌ Wiring real GitHub PR merge logic into experience approval
- ✅ Preview → Approve → Publish as status transitions in Supabase only
- Why: Review is an illusion layer. GitHub mapping happens later if needed.

### SOP-13: Do not over-abstract or generalize prematurely
**Learned from**: Coordinator guidance

- ❌ "Let's add abstraction here" / "Let's generalize this" / "Let's make a framework"
- ✅ Concrete, obvious, slightly ugly but working
- Why: Working code that ships beats elegant code that drifts.

### SOP-14: Supabase client must use `cache: 'no-store'` in Next.js
**Learned from**: Stale library state bug (Sprint 4 stabilization)

- ❌ `createClient(url, key, { auth: { ... } })` (no fetch override)
- ✅ `createClient(url, key, { auth: { ... }, global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) } })`
- Why: Next.js 14 patches `fetch()` and caches all responses by default. Supabase JS uses `fetch` internally. Without `cache: 'no-store'`, server components render stale data even with `force-dynamic`. This caused a multi-sprint bug where the homepage and library showed wrong experience statuses.

### SOP-15: Storage adapter must fail fast — never silently fallback
**Learned from**: Split-brain diagnosis (Sprint 4 stabilization)

- ❌ `if (!supabaseUrl) { return new JsonFileStorageAdapter() }` (silent fallback)
- ✅ `if (!supabaseUrl) { throw new Error('FATAL: Supabase not configured') }`
- ✅ Only fallback when `USE_JSON_FALLBACK=true` is explicitly set in `.env.local`
- Why: Silent fallback caused a "split-brain" where the app appeared to run but read/wrote to JSON while the user expected Supabase. Data mutations were invisible. The adapter now logs which backend is active on first use.

### SOP-16: Experiences Must Auto-Activate on Mount
**Learned from**: 422 errors on ephemeral completion (Phase 7 stabilization)

- ❌ Trying to transition from `injected` directly to `completed`.
- ✅ Handle `start` (ephemeral) or `activate` (persistent) on mount in `ExperienceRenderer.tsx`.
- Why: The state machine requires an `active` state before `completed`. We ensure the user enters that state as soon as they view the workspace.

### SOP-17: Automate Synthesis on Completion
**Learned from**: GPT state stale snapshots (Phase 7 stabilization)

- ❌ Finishing an experience and relying on "eventual" background synthesis.
- ✅ Explicitly call `POST /api/synthesis` after marking an instance as `completed`.
- Why: High-latency background workers aren't built yet. To ensure the GPT re-entry loop is "intelligent" immediately after user action, we trigger a high-priority snapshot sync.

### SOP-18: Dev harness must validate renderer contracts before inserting
**Learned from**: Broken test experiences (Sprint 4 stabilization)

- ❌ Creating test experience steps with payloads that don't match what the renderer reads (e.g., `content` string instead of `sections[]` for LessonStep).
- ✅ The dev harness (`/api/dev/test-experience`) validates every step payload against the same contracts the renderers use before inserting.
- Why: If the harness creates broken data, all downstream testing is meaningless. The harness is the first trust boundary.

### SOP-19: New pages must use `export const dynamic = 'force-dynamic'`
**Learned from**: Stale server component data (Sprint 4)

- ❌ Server component pages without `dynamic` export serving cached data.
- ✅ Always add `export const dynamic = 'force-dynamic'` on pages that read from Supabase.
- Why: Combined with SOP-14, this ensures both the page and the underlying fetch calls bypass Next.js caching.

### SOP-20: Use v1 contracts for payload validation — not incidental structure
**Learned from**: Sprint 5 Gate 0 contract canonicalization

- ❌ Validating against whatever the renderer happens to read today (`if (payload.sections?.length)`).
- ✅ Import from `lib/contracts/step-contracts.ts` and validate against the contracted shape.
- Why: Renderers evolve. Contracts are explicit and versioned. Validators that check contracted fields survive renderer upgrades.

### SOP-21: Checkpoint sections must distinguish `confirm` vs `respond` mode
**Learned from**: Sprint 5B field test — "Write 3 sentences" rendered as "I Understand" button

- ❌ All checkpoint sections rendering only a confirmation button.
- ✅ Detect writing-prompt keywords in body (write, describe, explain, list, draft) or use explicit `mode: 'respond'` field → render a textarea instead of a button.
- Why: The GPT naturally writes checkpoints that ask the user to *write* something. If the renderer only confirms, the user sees a prompt with nowhere to respond.

### SOP-22: Draft persistence must round-trip — save is not enough
**Learned from**: Sprint 5B field test — drafts fire as telemetry events but never hydrate back

- ❌ Calling `onDraft()` / `trackDraft()` and assuming the work is saved.
- ✅ Use `useDraftPersistence` hook which saves to `artifacts` table AND hydrates on next visit.
- Why: `interaction_events.draft_saved` is telemetry (append-only, for friction analysis). `artifacts` with `artifact_type = 'step_draft'` is the durable draft store (upserted, read back by renderers).

### SOP-23: Genkit flows are services, not routes — and must degrade gracefully
**Learned from**: Sprint 7 architecture

- ❌ Calling a Genkit flow directly from an API route handler.
- ❌ Letting a missing `GEMINI_API_KEY` crash the app.
- ✅ Call flows from service functions via `runFlowSafe()` wrapper. If AI is unavailable, fall back to existing mechanical behavior.
- Why: AI enhances; it doesn't gate. The system must work identically with or without `GEMINI_API_KEY`. Services own the fallback logic.

### SOP-24: MiraK webhook payloads go through validation — never trust external agents
**Learned from**: Sprint 8 architecture (Knowledge Tab design)

- ❌ Trusting MiraK's JSON payload shape without validation.
- ✅ Validate via `knowledge-validator.ts` before writing to DB. Check required fields, validate unit_type against `KNOWLEDGE_UNIT_TYPES`, reject malformed payloads with 400.
- Why: MiraK is a separate service (Python on Cloud Run). Its output format may drift. The webhook is the trust boundary — validate everything before persistence.

### SOP-25: GPT-facing endpoints go through the gateway — not fine-grained routes
**Learned from**: Sprint 10 architecture (enrichment.md Pillar 3)

- ❌ Adding a new `/api/tutor/chat` endpoint for every new GPT capability.
- ❌ Expanding GPT instructions with inline payload schemas for every new step type.
- ✅ Route all GPT actions through compound gateway endpoints (`/api/gpt/create`, `/api/gpt/update`, `/api/gpt/teach`, `/api/gpt/plan`).
- ✅ GPT learns schemas at runtime via `GET /api/gpt/discover?capability=X`.
- Why: Custom GPT instructions have practical size limits. Every new endpoint adds prompt debt. The gateway + discover pattern lets the system scale without growing the schema or instructions. "Adding a feature should not grow the schema."

### SOP-26: Curriculum outline must exist before multi-step experience generation
**Learned from**: Sprint 10 architecture (enrichment.md Pillar 1)

- ❌ GPT creating a 6-step "Understanding Business" experience directly from chat vibes.
- ✅ GPT creates a curriculum outline first (via `POST /api/gpt/plan`), then generates right-sized experiences from the outline.
- Why: Without planning, broad subjects collapse into giant vague experiences. The outline is the scoping artifact that prevents this failure mode. Ephemeral micro-nudges skip planning; serious learning domains require it.

### SOP-27: Genkit flows must use dynamic `await import()` in Next.js API routes
**Learned from**: Sprint 10 Lane 7 build fix — coach/chat and coach/grade routes

- ❌ `import { tutorChatFlow } from '@/lib/ai/flows/tutor-chat-flow'` at module top level.
- ✅ `const { tutorChatFlow } = await import('@/lib/ai/flows/tutor-chat-flow')` inside the route handler.
- Why: Genkit flows import `@genkit-ai/googleai` which initializes at module load time. During `next build`, this causes failures because the AI plugin tries to configure itself without runtime context. Dynamic imports defer loading until the route is actually called. This is the same pattern used by `runKnowledgeEnrichment` in `knowledge-service.ts`.

### SOP-28: Experience sizing — 3-6 steps per experience, one subtopic
**Learned from**: Sprint 10 → Sprint 12 retrospective — oversized experiences

- ❌ Creating an 18-step experience covering an entire domain (e.g., "Understanding Business").
- ✅ One experience = one subtopic from a curriculum outline. 3-6 steps. 1-2 sessions to complete.
- Why: Oversized experiences create false completion drag, break the Kolb rhythm (primer → practice → checkpoint → reflection), and make progress invisible. Chain small experiences instead of building one monolith.

### SOP-29: The Async Research UX Rule — Fire and Forget
**Learned from**: Sprint 12 Productization UX Audit

- ❌ Telling the user to wait a few minutes while research generates.
- ❌ Building a spinner or loading UI that blocks the user from continuing.
- ✅ Tell the user: "I've dispatched my agent to research this. You can start the experience now — it will get richer later." Let the async webhook gracefully append steps and links in the background.
- Why: MiraK executes in 1-2 minutes. The user shouldn't be blocked. They should step into the scaffolding immediately, and the app should feel magical when it dynamically enriches their active workspace.

### SOP-30: Batch chatty service fetches — never loop individual queries
**Learned from**: Sprint 12 productization — N+1 patterns in home page, checkpoint grading, KnowledgeCompanion

- ❌ `for (const exp of activeExps) { await getInteractions(exp.id) }` (sequential N+1)
- ❌ `for (const q of questions) { await fetch('/api/coach/grade', { body: q }) }` (sequential HTTP)
- ❌ `for (const link of links) { await fetch('/api/knowledge/' + link.id) }` (per-unit fetches)
- ✅ Create batch endpoints: `/api/coach/grade-batch`, `/api/knowledge/batch?ids=a,b,c`
- ✅ Create composed service functions: `getHomeSummary(userId)` that runs one query with joins.
- Why: Sequential per-item fetches in server components or client loops create visible latency and waste DB connections. One query that returns N items is always better than N queries that each return 1.

### SOP-31: Mastery promotion must use the experience instance's user_id
**Learned from**: Sprint 12 verification — grade route used DEFAULT_USER_ID

- ❌ `promoteKnowledgeProgress(DEFAULT_USER_ID, unitId)` (hardcoded user)
- ✅ `promoteKnowledgeProgress(instance.user_id, unitId)` (from the experience instance)
- Why: When auth is eventually added, mastery must belong to the correct user. Even in single-user dev mode, always propagate the user_id from the data source, not from constants.

### SOP-32: Discover registry examples must match step-payload-validator — not renderer
**Learned from**: Sprint 13 truth audit — 4/6 step types had validation-breaking examples

- ❌ Writing discover registry examples based on what the renderer reads (e.g., `prompt: string` for reflection).
- ✅ Write discover registry examples that pass `validateStepPayload()`. Cross-reference `lib/validators/step-payload-validator.ts` for exact field names.
- Why: GPT reads the discover registry to learn how to build step payloads. If the example uses `questions[].text` but the validator requires `questions[].label`, GPT generates payloads that fail creation. The discover registry is a GPT-facing contract — it must match the runtime validator, not the renderer's incidental read pattern.

### SOP-33: Mastery recompute action must be `recompute_mastery` with `goalId`
**Learned from**: Sprint 13 truth audit — ExperienceRenderer sent `action: 'recompute'` (wrong)

- ❌ `body: JSON.stringify({ action: 'recompute' })` (wrong action name, missing goalId)
- ✅ `body: JSON.stringify({ action: 'recompute_mastery', goalId: outline.goalId })` (matches route handler)
- Why: The skills PATCH route handler checks `action === 'recompute_mastery' && goalId`. If either is wrong, the request silently falls through to the standard update path and mastery is never recomputed. This was causing mastery to not update on experience completion.

---

## Lessons Learned (Changelog)

- **2026-03-22**: Initial agents.md created during Sprint 1 boardinit.
- **2026-03-22**: Added SOP-5 (API-first mutations) and SOP-6 (JSON file storage).
- **2026-03-22**: Sprint 2 boardinit — GitHub factory. Added SOP-7 (adapter boundary), SOP-8 (service layer). Updated repo map with GitHub integration files.
- **2026-03-23**: Sprint 3 boardinit — Runtime Foundation. Added SOP-9 (Supabase through services), SOP-10 (resolution mandatory). Updated product summary to experience-engine model. Added Supabase to tech stack. Updated repo map with experience, interaction, synthesis files. Updated SOP-6 with adapter pattern.
- **2026-03-23**: Sprint 4 boardinit — Experience Engine. Added SOP-11 (persistent = clone of ephemeral), SOP-12 (no GitHub for experience review), SOP-13 (no premature abstraction). Updated repo map with workspace page details, interaction events, renderer registry. Added pitfalls for resolution UX enforcement, UUID discipline, and DEFAULT_USER_ID.
- **2026-03-24**: Split-brain stabilization. Root cause: silent JSON fallback + Next.js fetch caching of Supabase responses. Added SOP-14 (Supabase `cache: no-store`), SOP-15 (fail-fast storage). Quarantined `projects-service` and `prs-service` (realizations/realization_reviews schema mismatch). Added inbox normalization layer. Added `/api/dev/diagnostic` and `/api/dev/test-experience`. Updated pitfalls for fetch caching, quarantined services, inbox normalization, template ID prefix, and gptschema contract.
- **2026-03-24 (Phase 7)**: Feedback Loop & Robustness. Added SOP-16 (Auto-activation) and SOP-17 (Synthesis Trigger). Fixed synthesis 404 by exposing `POST /api/synthesis`. Aligned `LessonStep` sections schema. Verified closed-loop intelligence awareness in `/api/gpt/state`.
- **2026-03-24**: Sprint 5 boardinit — Groundwork sprint. Added SOP-18 (harness validates contracts), SOP-19 (force-dynamic on pages). Updated repo map with library page, ExperienceCard, HomeExperienceAction, reentry-engine. 5 heavy coding lanes: Graph+Chaining, Timeline, Profile+Facets, Validation+API Hardening, Progression+Renderer Upgrades. Lane 6 for integration/wiring/browser testing.
- **2026-03-25**: Sprint 5 completed. All 6 lanes done. Gate 0 contracts canonicalized (3 contract files). Graph service, timeline page, profile+facets, validators, progression engine all built. Updated repo map with contracts/, graph-service, timeline-service, facet-service, step-payload-validator. Added SOPs 20–22 from Sprint 5B field test findings.
- **2026-03-26**: Sprint 6 boardinit — Experience Workspace sprint. Based on field-test findings documented in `roadmap.md` Sprint 5B section. 5 coding lanes: Workspace Navigator, Draft Persistence, Renderer Upgrades, Steps API + Multi-Pass, Step Status + Scheduling. Lane 6 for integration + browser testing.
- **2026-03-26**: Sprint 6 completed. All 6 lanes done. Non-linear workspace model with sidebar/topbar navigators, draft persistence via artifacts table, renderer upgrades (checkpoint textareas, essay writing surfaces, expandable challenges/plans), step CRUD/reorder API, step status/scheduling migration 004. Updated repo map with StepNavigator, ExperienceOverview, DraftProvider, DraftIndicator, draft-service, useDraftPersistence, step-state-machine, step-scheduling. Updated OpenAPI schema (16 endpoints). Updated roadmap. Added SOP-23 (Genkit flow pattern). Added Genkit to tech stack.
- **2026-03-27**: Sprint 7 completed. All 6 lanes done. 4 Genkit flows (synthesis, suggestions, facets, GPT compression), graceful degradation wrapper, completion wiring, migration 005 (evidence column). Updated repo map with AI flow files and context helpers.
- **2026-03-27**: Sprint 8 boardinit — Knowledge Tab + MiraK Integration. Added SOP-24 (webhook validation). Added `types/knowledge.ts` to repo map. Added knowledge routes, constants, copy. Gate 0 executed by coordinator.
- **2026-03-27**: MiraK async webhook integration. Added MiraK microservice section to tech stack (FastAPI, Cloud Run, webhook routing). Rewrote `gpt-instructions.md` with fire-and-forget MiraK semantics. Added `knowledge.md` disclaimers (writing guide ≠ schema constraint). Updated `printcode.sh` to dump MiraK source code.
- **2026-03-27**: Major roadmap restructuring. Replaced Sprint 8B pondering with concrete Sprint 9 (Content Density & Agent Thinking Rails — 6 lanes). Added Sprint 10 placeholder (Voice & Gamification). Renumbered downstream sprints (old 9→11, 10→12, 11→13, 12→14, 13→15). Updated architecture snapshot to include MiraK + Knowledge + full Supabase table list. Added "Target Architecture (next 3 sprints)" diagram. Preserved all sprint history and open decisions.
- **2026-03-27**: Sprint 10 boardinit — Curriculum-Aware Experience Engine. Added SOP-25 (gateway pattern), SOP-26 (outline before experience). Updated repo map with gateway routes, gateway types, checkpoint renderer, tutor flows, curriculum types. 7 lanes: DB+Types, Gateway, Curriculum Service, Checkpoint+Knowledge Link, Tutor+Genkit, GPT Rewrite+OpenAPI, Integration+Browser.
- **2026-03-28**: Sprint 11 — MiraK Gateway Stabilization. Fixed GPT Actions `UnrecognizedKwargsError` by flattening OpenAPI schemas (no nested `payload` objects). Fixed MiraK webhook URL (`mira-mocha-kappa` → `mira-maddyup`). Fixed MiraK Cloud Run: added `--no-cpu-throttling` (background tasks were CPU-starved), fixed empty `GEMINI_SEARCH` env var (agent renamed it, deploy grep returned empty), added `.dockerignore`. Made webhook validator lenient (strips incomplete `experience_proposal` instead of rejecting entire payload). Added `readKnowledge` endpoint so GPT can read full research content. Created `c:/mirak/AGENTS.md` — standalone context for MiraK repo. Key lesson: always test locally before deploying, MiraK must be developed from its own repo context.
- **2026-03-29**: Roadmap rebase — Sprints 1–10 marked ✅ Complete, Sprint 11 ✅ Code Complete. Roadmap rebased off board truth. Sprint numbers shifted: old 11 (Goal OS) → 13, old 12 (Coder Pipeline) → 14, old 13 → 15, old 14 → 16, old 15 → 17, old 16 → 18. Sprint 12 is now Learning Loop Productization (surface existing intelligence). Added SOP-27 (Genkit dynamic imports), SOP-28 (experience sizing). Updated architecture diagram to show 7 Genkit flows, 6 GPT endpoints, enrichment mode. Removed stale "Target Architecture" section and "What is still stubbed" section — replaced with accurate "What is NOT visible to the user" gap analysis.
- **2026-03-29**: Sprint 13 completed (Goal OS + Skill Map). Gate 0 + 7 lanes. Migration 008 (goals + skill_domains tables). Goal service, skill domain service, skill mastery engine, GPT gateway goal capability, Skills page + SkillTreeGrid, batch grade + knowledge endpoints, home-summary-service (N+1 elimination). Added SOP-32 (discover-registry-validator sync), SOP-33 (mastery recompute action naming). Sprint 13 debt carried forward: discover-registry lies to GPT for 4/6 step types, stale OpenAPI, mastery recompute action mismatch in ExperienceRenderer.
- **2026-03-29**: Sprint 14 boardinit (Surface the Intelligence). 7 lanes: Schema Truth Pass, Skill Tree Upgrade, Intelligent Focus Today, Mastery Visibility + Checkpoint Feedback, Proactive Coach Surfacing, Completion Retrospective, Integration + Browser QA. Incorporates UX feedback items #1 (skill cards as micro-roadmaps), #2 (intelligent Focus Today), #5 (mastery changes inline), #6 (proactive coach with context), #7 (completion retrospective). Deferred: #9 (fog-of-war), #10 (MiraK depth control), #12 (user agency), #8 (GPT session history), #11 (nav restructure), #14 (MiraK gap analyst).
- **2026-03-29**: Sprint 14 completed (Surface the Intelligence). All 7 lanes done. Fixed discover-registry/validator alignment for all 7 step types (SOP-32). Fixed mastery N+1 pattern in `computeSkillMastery()` (SOP-30). Removed dead `outlineIds` from goal creation + migration 008. Updated OpenAPI with goalId on plan endpoint. Added `plan_builder` to discover registry. Skill Tree cards upgraded to micro-roadmaps with evidence-needed and next-experience links. Focus Today uses priority heuristic (scheduled > mastery proximity > failed checkpoints > recency). Checkpoint shows mastery impact callout + toast. Coach surfaces with question-level context after failed checkpoints. Completion screen shows "What Moved" mastery transitions and "What You Did" activity summary. No new SOPs — this was a pure wiring/polish sprint.
- **2026-03-29**: Sprint 15 boardinit (Chained Experiences + Spontaneity). 7 lanes: Experience Chaining + Graph UI, Ephemeral Injection System, Re-Entry Engine + Follow-Ups, Friction Synthesis + Weekly Loops, Timeline Page, Profile Page Upgrade, Integration + Browser QA. Wires existing backend infrastructure (graph service, progression rules, re-entry engine, timeline service, facet service from Sprints 5-7) into the lived UX. Two new components (EphemeralToast, ReentryPromptCard). Two page upgrades (Timeline, Profile). Deferred from roadmap: fog-of-war, MiraK depth control.
- **2026-03-30**: Sprint 15 completed (Chained Experiences + Spontaneity). All 7 lanes done. Fixed 500 error on synthesis endpoint (duplicate key constraint in `facet-service` upsert). Updated `storage.ts` with Sprint 10+ collections to immunize JSON fallback users against crashes. Clarified roadmap numbering going forward: Sprint 16 is definitively the Coder Pipeline (Proposal → Realization — formerly Sprint 14). Sprint 17 is GitHub Hardening.

```

### board.md

```markdown
# Mira Studio — Sprint Board

## Sprint History

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 1 | Make It Real (Local-First) | TSC ✅ Build ✅ | ✅ Complete |
| Sprint 2 | GitHub Factory (Token-First) | TSC ✅ (Lanes 1–5) | ✅ Complete (Lane 6 deferred) |
| Sprint 3 | Runtime Foundation — Supabase + Experience Types + Renderer + Capture + Integration | TSC ✅ Build ✅ | ✅ Complete — Full ephemeral loop proven. 16 Supabase tables live. |
| Sprint 4 | Experience Engine — Persistent lifecycle, Library, Review, Home, Re-entry | TSC ✅ Build ✅ | ✅ Complete — Full loop: propose → approve → workspace → complete → GPT re-entry. |
| Sprint 5 | Groundwork: Contracts, Graph, Timeline, Profile, Validation, Progression | TSC ✅ Build ✅ | ✅ Complete — Gate 0 contracts, experience graph, timeline, profile, validators, renderer upgrades. All 6 lanes done. |
| Sprint 6 | Experience Workspace: Navigator, Drafts, Renderer Upgrades, Steps API, Scheduling | TSC ✅ Build ✅ | ✅ Complete — Non-linear workspace model, draft persistence, sidebar/topbar navigators, step status/scheduling migration. All 6 lanes done. |
| Sprint 7 | Genkit Intelligence Layer — AI synthesis, facet extraction, smart suggestions, GPT state compression | TSC ✅ Build ✅ | ✅ Complete — 4 Genkit flows, graceful degradation, completion wiring, migration 005. All 6 lanes done. |
| Sprint 8 | Knowledge Integration — Knowledge units, domains, mastery, MiraK webhook, 3-tab unit view, Home dashboard | TSC ✅ Build ✅ | ✅ Complete — Migration 006, Knowledge Tab, domain grid, MiraK webhook, companion integration. All 6 lanes done. |
| Sprint 9 | Content Density & Agent Thinking Rails — Real MiraK pipeline, Genkit enrichment, GPT thinking protocol, Knowledge UI polish | TSC ✅ Build ✅ | ✅ Complete — Real 3-stage agent pipeline, enrichment flow, thinking rails, multi-unit UI. All 6 lanes done. |
| Sprint 10 | Curriculum-Aware Experience Engine — Curriculum outlines, GPT gateway, discover registry, coach API, tutor flows, OpenAPI rewrite | TSC ✅ Build ✅ | ✅ Complete — 7 lanes done. Migration 007, 5 gateway endpoints, 3 coach routes, curriculum service, Genkit tutor + grading flows. |
| Sprint 11 | MiraK Gateway Stabilization + Enrichment Loop — Flat OpenAPI, Cloud Run fixes, enrichment webhook, discover registry | TSC ✅ Build ✅ | ✅ Complete — All lanes done. |
| Sprint 12 | Learning Loop Productization — Visible Track UI, Checkpoint renderer, Coach Triggers, Synthesis Completion, Pre/In/Post Knowledge | TSC ✅ Build ✅ Browser ✅ | ✅ Complete — 7 lanes done. Three emotional moments fully functional. |
| Sprint 13 | Goal OS + Skill Map — Goal entity, Skill domains, mastery engine, GPT goal intake, Skill Tree UI, batch endpoints, home summary optimization | TSC ✅ Build ✅ | ✅ Complete — Gate 0 + 7 lanes. Migration 008, Goal/Skill CRUD, mastery engine, SkillTreeGrid, batch endpoints, home-summary-service. |
| Sprint 14 | Surface the Intelligence — Schema truth pass, Skill Tree upgrade, Focus Today heuristics, mastery visibility, proactive coach, completion retrospective | TSC ✅ Build ✅ Browser ✅ | ✅ Complete — 7 lanes. Fixed discover-registry/validator alignment (7 step types), mastery N+1 (SOP-30), OpenAPI goalId, dead outlineIds. All W items verified. |

---

# Sprint 15 — Chained Experiences + Spontaneity

> **Goal:** Make the app feel **alive**. Experiences should chain into each other, GPT should be able to interrupt with ephemerals, the re-entry engine should fire at the right moments, and two new surfaces — Timeline and Profile — should make the user's full journey visible.
>
> **The test:** (1) Completing a Questionnaire surfaces a Plan Builder suggestion via the experience graph. (2) GPT can inject an ephemeral challenge that renders instantly as a toast-like card. (3) Re-entry contract fires after completion and shows in GPT state. (4) Friction level is computed and returned in the synthesis packet. (5) Timeline page shows full chronological event history including ephemerals. (6) Profile page reflects accumulated AI-extracted facets.
>
> **Core principle:** The backend infrastructure (graph service, progression rules, re-entry engine, timeline service, facet service) already exists from Sprints 5–7. This sprint is about **wiring it into the lived UX** and making it drive user behavior, not just sit as queryable data.

---

## Dependency Graph

```
Lane 1:  [W1–W4 EXPERIENCE CHAINING + GRAPH UI]    (independent — library, completion, workspace)
Lane 2:  [W1–W4 EPHEMERAL INJECTION SYSTEM]         (independent — home, workspace, GPT gateway)
Lane 3:  [W1–W4 RE-ENTRY ENGINE + FOLLOW-UPS]       (independent — engine, GPT state, home)
Lane 4:  [W1–W3 FRICTION SYNTHESIS + WEEKLY LOOPS]   (independent — progression engine, graph service)
Lane 5:  [W1–W4 TIMELINE PAGE]                       (independent — new page, existing service)
Lane 6:  [W1–W4 PROFILE PAGE UPGRADE]                (independent — existing page, facet service)
                                    │
                                    ↓
ALL 6 ──→ Lane 7:  [W1–W6 INTEGRATION + BROWSER QA]
```

---

## Sprint 15 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Experience graph UI | `components/experience/CompletionScreen.tsx` (chain suggestions section), `app/library/LibraryClient.tsx` (continue/related links), `app/workspace/[instanceId]/WorkspaceClient.tsx` (chain context banner), `lib/services/graph-service.ts` (completion wiring) | Lane 1 |
| Ephemeral injection | `components/experience/EphemeralToast.tsx` (NEW), `app/page.tsx` (ephemeral section), `app/api/experiences/inject/route.ts` (notification flag), `components/experience/ExperienceRenderer.tsx` (ephemeral auto-chain) | Lane 2 |
| Re-entry engine | `lib/experience/reentry-engine.ts`, `lib/services/synthesis-service.ts` (GPT state packet), `app/page.tsx` (re-entry prompts section), `components/common/ReentryPromptCard.tsx` (NEW) | Lane 3 |
| Friction + loops | `lib/experience/progression-engine.ts` (friction in synthesis), `lib/services/graph-service.ts` (loop creation), `lib/services/experience-service.ts` (recurring instance), `types/experience.ts` (recurring fields) | Lane 4 |
| Timeline page | `app/timeline/page.tsx`, `app/timeline/TimelineClient.tsx`, `components/timeline/TimelineEventCard.tsx`, `components/timeline/TimelineFilterBar.tsx`, `lib/services/timeline-service.ts` | Lane 5 |
| Profile page | `app/profile/page.tsx`, `app/profile/ProfileClient.tsx`, `components/profile/DirectionSummary.tsx`, `components/profile/FacetCard.tsx`, `components/profile/SkillTrajectory.tsx` (NEW) | Lane 6 |
| Integration | All pages (read-only browser QA), `board.md`, `agents.md`, `roadmap.md` | Lane 7 |

---

## Lane 1 — Experience Chaining + Graph UI

> Wire the experience graph into the UI so users see "Continue →" and "Related" links. Make the chain visible after completion.

**W1 — CompletionScreen shows chain suggestions from progression rules** ⬜
- In `components/experience/CompletionScreen.tsx`:
  - After the existing "Next Suggested Paths" section, add a "Continue Your Chain" section
  - Call `getSuggestionsForCompletion(instanceId)` from `graph-service.ts`
  - For each suggestion: show the `templateClass` icon, `reason` text, and a "Start Next →" button
  - "Start Next →" calls `POST /api/gpt/create` with `type: 'experience'`, `templateClass`, resolution carry-forward, and `previous_experience_id` set to the current instance
- Uses: `lib/services/graph-service.ts` `getSuggestionsForCompletion()`

**W2 — Library shows "continue" and "related" links on active/completed cards** ⬜
- In `app/library/LibraryClient.tsx`:
  - For each active experience card: if `next_suggested_ids` has entries, show "Continue →" link to the first suggested instance
  - For each completed experience card: if `previous_experience_id` is set, show "← Previous" breadcrumb link
  - Fetch chain context via the existing `/api/experiences/[id]/chain` route (already exists)
- Style the links as subtle indigo-tinted pills

**W3 — Workspace shows chain context banner** ⬜
- In `app/workspace/[instanceId]/WorkspaceClient.tsx` or `page.tsx`:
  - If the experience has a `previous_experience_id`, show a slim banner at the top: "Part of a chain — Previous: [Title]"
  - If `next_suggested_ids` exist, show at the bottom: "Up next: [Title] →"
  - Fetch chain context via `getExperienceChain(instanceId)` from `graph-service.ts`

**W4 — Wire linkExperiences on completion** ⬜
- In `ExperienceRenderer.tsx` completion handler (or `completeExperienceWithAI`):
  - After completion, call `getSuggestionsForCompletion(instanceId)` to get the next template class
  - If GPT has already created a follow-up experience (via `next_suggested_ids`), call `linkExperiences(currentId, nextId, 'chain')` to wire the graph edge
  - Update the GPT state packet to include `activeChains` and `deepestChain` from `getGraphSummaryForGPT()`

**Done when:**
- Completion screen shows chain-based suggestions with "Start Next →"
- Library cards show chain links (continue / previous)
- Workspace banner shows chain position
- Graph edges are wired on completion
- TSC clean

---

## Lane 2 — Ephemeral Injection System

> Let GPT drop interruptive micro-experiences that appear as toast-like prompts. Make ephemeral creation feel instant and alive.

**W1 — EphemeralToast component** ✅
- **Done**: Created `EphemeralToast.tsx` with slide-in animation, auto-dismiss progress bar, and "Start Now" navigation. 
- Create `components/experience/EphemeralToast.tsx`:
  - A floating card component (bottom-right or top of page) that announces a new ephemeral experience
  - Props: `title`, `goal`, `experienceClass`, `instanceId`, `onDismiss`, `onStart`
  - "Start Now →" button navigates to `/workspace/${instanceId}`
  - "Later" button dismisses (stores dismissed ID in sessionStorage)
  - Auto-dismiss after 15 seconds with a progress bar
  - Dark theme, indigo accent, subtle slide-in animation

**W2 — Home page ephemeral section** ✅
- **Done**: Added "Just Dropped" section to `app/page.tsx` and updated `home-summary-service.ts` to fetch pending injected ephemerals.
- In `app/page.tsx`:
  - Query for recent ephemeral experiences in `injected` status (created in the last 24h, not yet started)
  - Render them in a "Spontaneous" or "Just Dropped" section below Focus Today
  - Each card shows title, class icon, and "Jump In →" link
  - If no pending ephemerals, section is hidden (not empty state)

**W3 — Inject route returns notification metadata** ✅
- **Done**: Updated `api/experiences/inject/route.ts` to return `notification` object and added `urgency` validation to `experience-validator.ts`.
- In `app/api/experiences/inject/route.ts`:
  - After creating the ephemeral instance, include `notification: { show: true, toast: true }` in the response
  - This metadata enables the GPT or frontend to decide whether to show the toast
  - Add optional `urgency: 'low' | 'medium' | 'high'` field to the inject request schema
  - Urgency maps to toast duration: low=15s, medium=30s, high=persistent

**W4 — GPT discover entry for ephemeral injection** ✅
- **Done**: Updated `lib/gateway/discover-registry.ts` with `urgency` parameter in `create_ephemeral` capability and refined usage guidance.
- In `lib/gateway/discover-registry.ts`:
  - Verify the existing `ephemeral` capability has an accurate example including `urgency` and notification metadata
  - Add `when_to_use` guidance: "Drop micro-challenges, trend alerts, or quick daily reflections. Fire-and-forget. User sees a toast and can choose to engage."

**Done when:**
- EphemeralToast renders with slide-in animation and auto-dismiss
- Home page shows pending ephemerals in a dedicated section
- Inject route returns notification metadata
- GPT discover registry has accurate ephemeral guidance
- TSC clean (Note: Existing errors in Lane 6 / profile-service, Lane 2 is clean)

---

## Lane 3 — Re-Entry Engine + Follow-Up Prompts

> Harden the re-entry engine and surface re-entry prompts on the home page so the user feels pulled back in.

**W1 — Re-entry engine: add `time` and `manual` triggers** ✅
- **Done**: Added `time` and `manual` triggers, implemented batch interaction fetching to fix N+1, and added `priority` logic with sorting.
**W2 — ReentryPromptCard component** ✅
- **Done**: Created `ReentryPromptCard.tsx` with priority/trigger badges and dark theme styling consistent with `FocusTodayCard`.
**W3 — Home page "Pick Up Where You Left Off" section** ✅
- **Done**: Wired `evaluateReentryContracts` to the home page, sorted by priority, and added the "Pick Up Where You Left Off" section with a "View all" link.
**W4 — GPT state includes re-entry prompts with priority** ✅
- **Done**: Modified `buildGPTStatePacket` to explicitly carry prompt priority and added `reentryCount` to the state packet for GPT awareness.

**Done when:**
- Re-entry engine supports `time` and `manual` triggers
- Inactivity trigger uses batch fetch (no N+1)
- Re-entry prompts appear on home page with priority badges
- GPT state packet includes prompt priorities
- TSC clean

---

## Lane 4 — Friction Synthesis + Weekly Loops

> Wire friction computation into the synthesis loop. Enable recurring experience instances.

**W1 — Friction level persisted in synthesis snapshot** ✅
- In `lib/services/experience-service.ts` `completeExperienceWithAI()`: moved `updateInstanceFriction()` before synthesis.
- In `synthesis-service.ts` `createSynthesisSnapshot()`: pulling `friction_level` into `key_signals`.
- In `buildGPTStatePacket()`: ensure `frictionSignals` are in the compressed state narrative.

**W2 — Weekly loop service function** ✅
- In `lib/services/graph-service.ts`: added `createLoopInstance()` to clone experiences for recurrence and `getLoopHistory()`.

**W3 — Loop creation wired to completion** ✅
- In `completeExperienceWithAI()`: added logic to automatically spawn loop instances and link them when `timeScope` is 'ongoing'.
- Set loop status to `proposed` for visibility in Library.

**Done when:**
- Friction level flows into synthesis snapshots
- `createLoopInstance()` creates linked recurring instances
- Loop creation fires automatically for ongoing/time-triggered experiences
- Loop history is queryable via `getLoopInstances()`
- TSC clean

---

## Lane 5 — Timeline Page

> Upgrade the existing timeline page stub into a real, filterable event feed.

**W1 — Timeline page server component** ✅
- In `app/timeline/page.tsx`: 
  - Upgraded to fetch real data via `getTimelineEntries(userId)` and `getTimelineStats`
  - Added `export const dynamic = 'force-dynamic'` for fresh data
  - Passed stats (Total, Week, etc.) to the client for the summary section

**W2 — TimelineClient with filtering** ✅
- In `app/timeline/TimelineClient.tsx`:
  - Implemented category filter tabs with dynamic counts (All, Experiences, Ideas, System, GitHub)
  - Implemented date-based grouping: "Today", "Yesterday", "This Week", "Earlier"
  - Added stats summary block at the top showing key trajectory metrics

**W3 — TimelineEventCard upgrade** ✅
- In `components/timeline/TimelineEventCard.tsx`:
  - Upgraded styling for the dark studio theme with premium hover effects
  - Category-specific color coding (indigo for experience, amber for idea, etc.)
  - Relative time display using `lib/date.ts`
  - Added "⚡ Ephemeral" badge for ephemeral injections

**W4 — Timeline service: add ephemeral + knowledge events** ✅
- In `lib/services/timeline-service.ts`:
  - Added knowledge unit arrival events (last 7 days)
  - Added mastery promotion events from `knowledge_progress`
  - Distinguished ephemeral injections in experience entries with metadata
  - Enhanced stats service to include system and github categories

**Done when:**
- Timeline page renders real data with category filters
- Event cards have category colors, relative time, entity links
- Ephemeral events and knowledge arrivals appear in the feed
- Stats summary at top
- TSC clean (verified for timeline files specifically)

---

## Lane 6 — Profile Page Upgrade

> Transform the existing profile page from a skeleton into a living dashboard reflecting the user's accumulated trajectory.

**W1 — Profile page: Goal + Skill Trajectory section** ✅
- **Done**: Added goal and skill domain fetching to `ProfilePage`, and created a new responsive `SkillTrajectory` component that visualizes mastery progress toward evidence-based milestones.
- In `app/profile/page.tsx`:
  - Fetch goal data via `getGoals(userId)` from `goal-service.ts`
  - Fetch skill domains via `getSkillDomains(userId)` from `skill-domain-service.ts`
  - Pass to a new `SkillTrajectory` component
- Create `components/profile/SkillTrajectory.tsx`:
  - Shows active goal title + status badge
  - Below: mastery levels for each linked skill domain as a horizontal bar chart
  - Each bar: domain name, current mastery level label, evidence count / threshold progress
  - Color coding: undiscovered=slate, aware=sky, beginner=amber, practicing=emerald, proficient=indigo, expert=purple

**W2 — Profile page: Experience History summary** ✅
- **Done**: Enhanced `UserProfile` with advanced activity metrics (completion rate, top focus class, average friction) and implemented an "Activity" dashboard in `ProfileClient`.
- In `app/profile/ProfileClient.tsx`:
  - Add an "Activity" section showing experience count breakdown: total, completed, active, ephemeral
  - Show completion rate percentage
  - Show most active experience class (computed from completed experiences by template class)
  - Show average friction level across completed experiences

**W3 — FacetCard upgrade** ✅
- **Done**: Upgraded `FacetCard` with confidence indicators (dots), evidence snippets, "Strong Signal" badges, and source snapshot references.
- In `components/profile/FacetCard.tsx`:
  - Add confidence indicators (dots or progress ring)
  - Show evidence string if present (from AI extraction)
  - Add "inferred from [N experiences]" source attribution
  - Highest-confidence facets get a "Strong Signal" badge

**W4 — DirectionSummary shows goal alignment** ✅
- **Done**: Enhanced `DirectionSummary` with active goal trajectory callouts, strongest domain highlights, and semantic pattern insights based on profile facets.
- In `components/profile/DirectionSummary.tsx`:
  - Upgrade props to include `activeGoal` and `skillDomains`.
  - Add Active goal callout with inline mastery snapshot
  - Add "Strongest domain: [Name] at [Level]" highlight
  - Add "Emerging pattern: [preferred_mode facet]" insight
  - Add "Time investment: [X experiences, Y hours estimated]" based on `estimated_minutes` heuristic.

**Done when:**
- Profile shows goal + skill trajectory with mastery bars ✅
- Activity section shows experience breakdown + friction averages ✅
- Facets are grouped and display confidence + evidence ✅
- Direction summary includes goal alignment insights ✅
- TSC clean (verified via npx tsc --noEmit) ✅

---

## Lane 7 — Integration + Browser QA

> Cross-lane wiring, regression checks, browser testing, documentation sync.

**W1 — Cross-lane type verification** ✅
- **Done**: TSC clean with all 6 lanes merged. Fixed 4 issues from engineer review:
  1. **BLOCKER**: `CompletionScreen.handleStartNext` payload now sends `template_id` + `user_id` + full instance shape (was sending `templateClass` + `userId` which would fail `createExperienceInstance`).
  2. **Verified**: GPT state DOES include re-entry priority and `reentryCount` (lines 110-118 of `synthesis-service.ts`). Board was accurate — no fix needed.
  3. **Fixed**: `entityType: 'experience' as any` in `timeline-service.ts` → proper `'knowledge'` type (added to `TimelineEntry.entityType` union).
  4. **Fixed**: `urgency="medium"` hardcoded on home toast → now maps from `resolution.intensity` (low→low, moderate→medium, high→high).
- Run `npx tsc --noEmit` — must pass with all 6 lanes merged
- Run `npm run build` — must succeed

**W2 — Browser QA: Home page** ✅
- Verify re-entry prompts section ("Pick Up Where You Left Off") renders when applicable
- Verify ephemeral "Just Dropped" section renders for pending ephemerals
- Verify Focus Today still works correctly with existing heuristics

**W3 — Browser QA: Timeline page** ✅
- Navigate to `/timeline`
- Verify entries render with category colors and relative time
- Verify filter tabs work (All, Experiences, Ideas, System)
- Verify clicking a card navigates to the correct entity

**W4 — Browser QA: Profile page** ✅
- Navigate to `/profile`
- Verify skill trajectory section renders with mastery bars
- Verify facet cards show grouped data with confidence indicators
- Verify experience history summary shows accurate counts

**W5 — Browser QA: Experience completion chain flow** ✅
- Complete an experience
- Verify CompletionScreen shows chain suggestions with "Start Next →"
- Verify the library shows "Continue →" on the chain
- Verify workspace banner shows chain context
- **Fix applied**: `facet-service.ts` was calling `adapter.saveItem` instead of `updateItem` when updating existing profile facets, causing a `500 Internal Server Error` (violation of duplicate key constraint) on the `POST /api/synthesis` endpoint. Fixed to use `updateItem`.

**W6 — Documentation sync** ✅
- Update `roadmap.md`: Mark Sprint 14 ✅, write Sprint 15 completion notes
- Update `board.md` final status markers for all lanes
- Update `agents.md` Lessons Learned with Sprint 14 notes + any new SOPs

**Done when:**
- TSC clean, build clean
- All browser QA items verified
- Documentation synced
- No console errors in browser during QA flow

---

## Pre-Flight Checklist

- [ ] TSC clean (`npx tsc --noEmit`)
- [ ] Build clean (`npm run build`)
- [ ] Dev server confirmed running (`npm run dev`)

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run tsc before marking ✅
3. **DO NOT perform visual browser checks**. Lane 7 handles all browser QA.
4. If a visual check is needed, mark as "✅ (Pending Visual Verification)" and the coordinator will check at the end.
5. Never touch files owned by other lanes
6. Never push/pull from git

## Test Summary

| Lane | TSC | Notes |
|------|-----|-------|
| Lane 1 | ✅ | Chaining components and graph hookup complete, TSC clean. |
| Lane 2 | ✅ | Ephemeral injections + UI toasts complete, TSC clean. |
| Lane 3 | ✅ | Lane 3 files are clean; existing errors remain in Lane 1, Lane 5, and Lane 6. |
| Lane 4 | ✅ | Friction synthesis and loop orchestration complete. |
| Lane 5 | ✅ | TSC clean for timeline-service, components, and pages. Pass initials entries + stats. |
| Lane 6 | ✅ | Profile upgrades complete, data flowing perfectly. |
| Lane 7 | ✅ | Integration and Browser QA completely wrapped up, 500 error synthesized and eliminated. |

```

### boardinit.md

```markdown
# boardinit — Multi-Agent Board Orchestration

> Generic workflow for setting up `board.md` and `agents.md` in any repo.
> Use this to divide work across N parallel agents with zero collisions.
> Never push/pull from git. All coordination happens through these two files.

---

## Required Outputs (Checklist — All Must Be Done)

Before you are finished with boardinit, you MUST produce ALL of these:

- [ ] `agents.md` — updated (see contract below)
- [ ] `board.md` — written with new sprint inline (compacted history + new lanes)
- [ ] Copy boxes posted in chat — one per lane, ready to paste into a new agent

Do not stop after writing the files. The copy boxes in chat are required.

---

## The Two Files — Strict Contracts

### `agents.md` — Evergreen Context (Never Sprint-Specific)

**Purpose**: Standing context for any agent entering this repo, at any time, regardless of what sprint is active or whether a sprint is running at all.

**Contains (always appropriate)**:
- Repo file map (what lives where)
- Tech stack and patterns (how things are built here)
- Standard Operating Procedures / SOPs (rules learned from bugs)
- Commands (dev, test, build, lint)
- Common pitfalls (things that break if you're not careful)
- Lessons Learned changelog (append after each sprint)

**NEVER put these in `agents.md`**:
- ❌ Sprint names or numbers marked "Active"
- ❌ File ownership tables per lane (e.g., "Lane 1 owns server.ts this sprint")
- ❌ Work items (W1, W2, W3...)
- ❌ Sprint-specific "done when" criteria
- ❌ A sprint status table (that belongs in board.md)

**Rule**: If the content would become stale or wrong the moment the sprint ends, it does NOT belong in `agents.md`.

---

### `board.md` — The Active Sprint Plan

**Purpose**: The live execution plan. Agents read this to find their lane and current work items. Updated during a sprint as items complete. 

**Contains**:
- Sprint history table (compact — one row per completed sprint, never full lane details)
- Current sprint lanes with work items (W1, W2, W3 w4 w5 or more...) **ALL INLINE.**
- Status markers (⬜ → 🟡 → ✅)
- Dependency/parallelization graph (ASCII, at top of new sprint)
- Ownership zones (which files belong to which lane — sprint-specific, lives HERE not agents.md)
- Pre-flight checklist
- Handoff protocol
- Test summary table
- Gates / phase boundaries (if the sprint is phased — see below)

---

## Size & Context Management (CRITICAL)

**Hard Rule: NEVER create separate lane files (e.g., `lanes/lane-1.md`).** All active sprint lanes, work items, and details must live directly inside `board.md`. Do not fragment the active sprint into separate files, regardless of length.

To keep `board.md` from becoming too large, we manage size by **compacting past sprints**. Once a sprint is entirely finished, its bloated context is summarized into a single row in the Sprint History table, and the old lane details are deleted. The active sprint is always fully detailed and inline.

---

## Gates & Phased Sprints

Sometimes a sprint needs a **gate** — a phase that must complete before lanes begin. This happens when:

- Multiple lanes depend on a shared contract (types, schemas, API shapes)
- Building against today's incidental structure would lock it in prematurely
- Validators or renderers would harden assumptions that haven't been formally agreed

### When to use a gate

| Signal | Action |
|--------|--------|
| Two or more lanes would independently define the same type | Gate: define it once first |
| A validation lane + a rendering lane both consume the same payload shape | Gate: formalize the payload contract |
| The sprint involves hardening/production-grading existing ad-hoc patterns | Gate: canonicalize the patterns before hardening |
| All lanes are truly independent (no shared contracts needed) | No gate needed — go straight to parallel lanes |

### Structure in `board.md`

Phase the sprint:
```markdown
## Sprint NA — Gate 0: [Contract Name]
> Purpose: one sentence
### Gate 0 Status
| Gate | Focus | Status |
| ⬜ Gate 0 | [Name] | G1 ⬜ G2 ⬜ G3 ⬜ |

## Sprint NB — Coding Lanes (begins after Gate 0 approval)
[normal lanes here]
```

### Execution rules for gated sprints

1. Gate must be explicitly marked ✅ before any lane begins
2. Lanes that consume contracts must import from the gate output (not re-derive)
3. The gate agent creates **types and documentation only** — no implementation, no services, no API routes
4. Gate items are labeled G1, G2, G3 (not W1, W2, W3) to distinguish from lane work items

### Contract-first pattern

When writing a gate, follow this pattern for each contract:

1. **Define the interface** with stability annotations (`@stable`, `@evolving`, `@computed`)
2. **Define valid enum arrays** for validators to import (e.g., `VALID_DEPTHS`, `VALID_MODES`)
3. **Define versioning** — how to handle unknown/future versions gracefully
4. **Define fallback policy** — what happens when a consumer encounters unknown values
5. **Write a reference doc** — a markdown file lane agents can read for quick orientation

Contract files go in a dedicated directory (e.g., `lib/contracts/`, `src/contracts/`). They export types and constants only — never services or side effects.

---

## How To Create/Update `agents.md`

### Step 1: Preserve all existing SOPs

Never delete SOPs — they are institutional memory. Only add new ones.

### Step 2: Update the repo map

Add any new files that were created since the last sprint (new pages, new modules, new docs).

### Step 3: Add new SOPs from bugs discovered this sprint

Format:
```markdown
### SOP-N: [Rule Name]
**Learned from**: [Sprint/bug that taught us this, or "universal"]

- ❌ [what not to do — concrete code example]
- ✅ [what to do instead — concrete code example]
```

### Step 4: Append to Lessons Learned changelog

```markdown
## Lessons Learned (Changelog)
- **2026-03-15**: Added SOP-17 (batch field mismatches) after check.md cataloged CHECK-001/002
```

### Step 5: Update test count + build status at the bottom

```markdown
Current test count: **223 passing** | Build: clean | TSC: clean
```

**Do NOT add**: sprint ownership tables, active sprint markers, W items, or anything that will be wrong next sprint.

---

## How To Create/Update `board.md`

### Step 1: Compact completed sprint

Reduce completed sprint to ONE row in the history table:
```markdown
| Sprint 8 | UX Polish + MediaPlan improvements | 200 | ✅ |
```
Delete all the old lane details for Sprint 8. Git has them if anyone ever needs them.

### Step 2: Write the new sprint section

Always starts with the ASCII dependency graph:

```
Lane 1:  [W1 ←FAST] ──→ [W2] ──→ [W3]
              │
              ↓
Lane 2:  [W1 ←INDEP] → [W2] → [W3]
```

Then the ownership zones table (sprint-specific — this is the right home for it):

```markdown
## Sprint N Ownership Zones
| Zone | Files | Lane |
|------|-------|------|
| Server batch | `server.ts` (L1296–L1650) | Lane 1 |
| Compose editor | `Compose.tsx`, `SlideTimeline.tsx`, `compose.ts` | Lane 2 |
```

Then write each lane section with W items, status markers, and "Done when" criteria directly underneath. **Do not link to separate files.**

### Step 3: Pre-flight and handoff sections

Always include:
```markdown
## Pre-Flight Checklist
- [ ] All N tests passing
- [ ] TSC clean
- [ ] Dev server confirmed running

## Handoff Protocol
1. Mark W items ⬜→🟡→✅ as you go
2. Run tsc + vitest before marking ✅
3. **DO NOT perform visual browser checks**. Parallel agents on the same repo cause Vite HMR and port conflicts.
4. If a visual check is needed, mark as "✅ (Pending Visual Verification)" and the coordinator will check at the end.
5. Never touch files owned by other lanes
6. Never push/pull from git
```

---

## Codebase Research Protocol

Before writing `board.md`, the planning agent must understand the codebase. This is the most time-consuming part of boardinit but also the most important — bad plans come from shallow understanding.

### Research steps

1. **Read `agents.md`** — get the standing context, SOPs, pitfalls
2. **Read the roadmap** (if one exists) — understand the strategic direction
3. **Read the existing `board.md`** — understand what was done in previous sprints
4. **Get file-level awareness** — use dumps, `find`, or `list_dir` to understand the current file tree
5. **Read key source files** — types, state machines, services, recent pages. Focus on files that define the system's grammar (types, transitions, constants)
6. **Identify ownership boundaries** — which files are coupled vs independent. This directly determines lane count

### Dump files

If the user provides dump files (concatenated source exports), read them. They're the fastest way to get full codebase context. Typical pattern:
- `dump00.md` — app routes + API handlers
- `dump01.md` — components + lib services
- `dump02.md` — types + config + remaining files

### What to look for

| Question | Why it matters |
|----------|---------------|
| What are the core types/interfaces? | Lanes must not redefine shared types |
| What's the state machine? | Lanes that touch transitions need to know the valid flows |
| What tables/collections exist? | New services need to know the persistence layer |
| What patterns do existing services follow? | New services should match (adapter pattern, error handling, etc.) |
| What's quarantined/broken? | Don't assign work that touches known-broken areas unless the sprint is specifically fixing them |

---

## How To Write Lane Prompt Copy Boxes

This step is REQUIRED. After writing the files, post one copy box per lane directly in the chat. The user will paste each one into a new agent. Do not summarize — give the actual paste-ready prompt.

**Format for each copy box**:

````
## Lane N — [Theme]

```
You are Lane N for this project.

1. Read `agents.md` — this is your standing context for the entire repo. Read it first.
2. Read `board.md` — find "Lane N — [Theme]". That is your work.
3. [Any lane-specific reading list — see below]
4. For each work item (W1–WN):
   - Mark ⬜ → 🟡 when you start it
   - Mark 🟡 → ✅ when done; add "- **Done**: [one sentence summary]"
   - [Any lane-specific instructions]
5. When all items are done:
   - Run `npx tsc --noEmit` — must pass
   - Run `npx vitest run` — report total passing count (if tests exist)
   - Update the test count row in board.md for your lane
6. Own only the files listed in board.md Sprint N Ownership Zones for Lane N
7. Never push/pull from git
8. DO NOT open the browser or perform visual checks — [integration lane] handles all browser QA
```
````

Each lane gets its own copy box. Do not merge them.

### Lane-specific reading lists

Every lane prompt should include a **reading list** — the specific files the agent must read before starting work. This prevents agents from guessing at existing patterns.

**Good reading list** (tells the agent exactly what to study):
```
3. Read `types/experience.ts`, `lib/services/experience-service.ts`,
   `lib/state-machine.ts`, and `lib/constants.ts` for existing patterns.
```

**Bad reading list** (too vague):
```
3. Familiarize yourself with the codebase.
```

Reading lists should include:
- The **types** the lane will produce or consume
- The **services** that follow the same pattern the lane should match
- The **components** being modified (if a UI lane)
- The **contract files** (if a gated sprint)
- Any **docs** that define the lane's requirements

---

## SOPs That Apply to Every Review

After any sprint, before writing the new board:

1. **What regressed?** → Add SOP to agents.md
2. **What was confusing?** → Add to Common Pitfalls in agents.md
3. **What new files were created?** → Add to Repo Map in agents.md
4. **Did you compact the previous sprint?** → Ensure the last completed sprint is reduced to a single row in the history table to keep `board.md` clean.

---

## Lane Sizing — Right-Sizing Workload
try to make sure the lanes 
```

### docs/archived/openapi-v1-pre-sprint10.yaml

```yaml
openapi: 3.1.0
info:
  title: Mira Studio API
  description: API for the Mira experience engine. Create experiences, fetch user
    state, record ideas.
  version: 1.0.0
servers:
- url: https://mira-maddyup.vercel.app/ 
  description: Current hosted domain
paths:
  /api/knowledge:
    get:
      operationId: listKnowledgeUnits
      summary: List all knowledge units
      description: |
        Returns all high-density research units (foundations, playbooks) created by MiraK.
        Use this to browse the current knowledge base before proposing new experiences or research.
      parameters:
        - name: domain
          in: query
          required: false
          schema:
            type: string
          description: Filter by broad domain (e.g., "SaaS Strategy")
        - name: unit_type
          in: query
          required: false
          schema:
            type: string
            enum: [foundation, playbook, deep_dive, example]
          description: Filter by unit type.
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  units:
                    type: object
                    additionalProperties:
                      type: array
                      items:
                        $ref: '#/components/schemas/KnowledgeUnit'
                  total:
                    type: integer
  /api/knowledge/{id}:
    get:
      operationId: getKnowledgeUnit
      summary: Get a single knowledge unit by ID
      description: |
        Returns the full, dense content of a specific research unit.
        Use this to read the reference material produced by MiraK.
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          description: The unit ID
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/KnowledgeUnit'
        '404':
          description: Unit not found
  /api/gpt/state:
    get:
      operationId: getGPTState
      summary: Get the user's current experience state for re-entry
      description: 'Returns a compressed state packet with active experiences, re-entry
        prompts, friction signals, and suggested next steps. Call this at the start
        of every conversation to understand what the user has been doing.

        '
      parameters:
      - name: userId
        in: query
        required: false
        schema:
          type: string
          default: a0000000-0000-0000-0000-000000000001
        description: User ID. Defaults to the dev user.
      responses:
        '200':
          description: GPT state packet
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GPTStatePacket'
        '500':
          description: Server error
  /api/experiences/inject:
    post:
      operationId: injectEphemeral
      summary: Create an ephemeral experience (instant, no review)
      description: 'Creates an ephemeral experience that renders instantly in the
        user''s app. Skips the proposal/review pipeline. Use for micro-challenges,
        quick prompts, trend reactions, or any experience that should appear immediately.

        '
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/InjectEphemeralRequest'
      responses:
        '201':
          description: Experience created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExperienceInstance'
        '400':
          description: Missing required fields
        '500':
          description: Server error
  /api/experiences:
    get:
      operationId: listExperiences
      summary: List experience instances
      description: 'Returns all experience instances, optionally filtered by status
        or type. Use this to check what experiences exist before creating new ones.

        '
      parameters:
      - name: userId
        in: query
        required: false
        schema:
          type: string
          default: a0000000-0000-0000-0000-000000000001
      - name: status
        in: query
        required: false
        schema:
          type: string
          enum:
          - proposed
          - drafted
          - ready_for_review
          - approved
          - published
          - active
          - completed
          - archived
          - superseded
          - injected
      - name: type
        in: query
        required: false
        schema:
          type: string
          enum:
          - persistent
          - ephemeral
      responses:
        '200':
          description: Array of experience instances
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ExperienceInstance'
        '500':
          description: Server error
    post:
      operationId: createPersistentExperience
      summary: Create a persistent experience (goes through proposal pipeline)
      description: 'Creates a persistent experience in ''proposed'' status. The user
        will see it in their library and can accept/start it. Use for substantial
        experiences that are worth returning to. Always include steps and a reentry
        contract.

        '
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePersistentRequest'
      responses:
        '201':
          description: Experience created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExperienceInstance'
        '400':
          description: Missing required fields
        '500':
          description: Server error
  /api/ideas:
    get:
      operationId: listIdeas
      summary: List captured ideas
      parameters:
      - name: status
        in: query
        required: false
        schema:
          type: string
      responses:
        '200':
          description: Array of ideas
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Idea'
    post:
      operationId: captureIdea
      summary: Capture a new idea from conversation
      description: 'Saves a raw idea from the conversation. Ideas can later be evolved
        into full experiences through the drill pipeline or direct proposal.

        '
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CaptureIdeaRequest'
      responses:
        '201':
          description: Idea captured
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/Idea'
  /api/synthesis:
    get:
      operationId: getLatestSynthesis
      summary: Get the latest synthesis snapshot
      description: 'Returns the most recent synthesis snapshot for the user. This
        is a compressed summary of recent experience outcomes, signals, and next candidates.

        '
      parameters:
      - name: userId
        in: query
        required: false
        schema:
          type: string
          default: a0000000-0000-0000-0000-000000000001
      responses:
        '200':
          description: Synthesis snapshot
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SynthesisSnapshot'
        '404':
          description: No snapshot found
        '500':
          description: Server error
  /api/interactions:
    post:
      operationId: recordInteraction
      summary: Record a user interaction event
      description: "Records telemetry about what the user did within an experience.\
        \ Use sparingly \u2014 the frontend handles most interaction recording. This\
        \ is available if you need to record a GPT-side event.\n"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RecordInteractionRequest'
      responses:
        '201':
          description: Interaction recorded
        '400':
          description: Missing required fields
        '500':
          description: Server error
  /api/experiences/{id}:
    get:
      operationId: getExperienceById
      summary: Get a single experience instance with its steps
      description: 'Returns a specific experience instance by ID, including all of
        its steps. Use this to inspect step content, check completion state, or load
        context before re-entry.

        '
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Experience instance ID
      responses:
        '200':
          description: Experience instance with steps
          content:
            application/json:
              schema:
                allOf:
                - $ref: '#/components/schemas/ExperienceInstance'
                - type: object
                  properties:
                    steps:
                      type: array
                      items:
                        $ref: '#/components/schemas/ExperienceStepRecord'
        '404':
          description: Experience not found
        '500':
          description: Server error
  /api/experiences/{id}/status:
    patch:
      operationId: transitionExperienceStatus
      summary: Transition an experience to a new lifecycle state
      description: "Moves an experience through its lifecycle state machine. Valid\
        \ transitions: - proposed \u2192 approve \u2192 publish \u2192 activate (or\
        \ use approve+publish+activate shortcut) - active \u2192 complete - completed\
        \ \u2192 archive - injected \u2192 start (ephemeral) The action must be a\
        \ valid transition from the current status.\n"
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Experience instance ID
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - action
              properties:
                action:
                  type: string
                  enum:
                  - draft
                  - submit_for_review
                  - request_changes
                  - approve
                  - publish
                  - activate
                  - complete
                  - archive
                  - supersede
                  - start
                  description: The transition action to apply
      responses:
        '200':
          description: Updated experience instance
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExperienceInstance'
        '400':
          description: Action is required
        '422':
          description: Invalid transition or instance not found
        '500':
          description: Server error
  /api/webhook/gpt:
    post:
      operationId: sendIdea
      summary: Send an idea via the GPT webhook (legacy envelope format)
      description: "Captures a new idea using the webhook envelope format with source/event/data\
        \ fields. The idea will appear in the Send page. This is an alternative to\
        \ the direct POST /api/ideas endpoint \u2014 use whichever format is more\
        \ convenient.\n"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - source
              - event
              - data
              properties:
                source:
                  type: string
                  enum:
                  - gpt
                  description: Always "gpt"
                event:
                  type: string
                  enum:
                  - idea_captured
                  description: Always "idea_captured"
                data:
                  type: object
                  required:
                  - title
                  - rawPrompt
                  - gptSummary
                  properties:
                    title:
                      type: string
                      description: Short idea title (3-8 words)
                    rawPrompt:
                      type: string
                      description: The user's original words
                    gptSummary:
                      type: string
                      description: Your structured 2-4 sentence summary
                    vibe:
                      type: string
                      description: "Energy/aesthetic \u2014 e.g. 'playful', 'ambitious',\
                        \ 'urgent'"
                    audience:
                      type: string
                      description: Who this is for
                    intent:
                      type: string
                      description: What the user wants to achieve
                timestamp:
                  type: string
                  format: date-time
                  description: ISO 8601 timestamp
      responses:
        '201':
          description: Idea captured
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/Idea'
                  message:
                    type: string
        '400':
          description: Invalid payload
  /api/experiences/{id}/chain:
    get:
      operationId: getExperienceChain
      summary: Get full chain context for an experience
      description: Returns upstream and downstream linked experiences in the graph.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Experience instance ID
      responses:
        '200':
          description: Experience chain context
    post:
      operationId: linkExperiences
      summary: Link this experience to another
      description: Creates an edge (chain, loop, branch, suggestion) defining relationship.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - targetId
              - edgeType
              properties:
                targetId:
                  type: string
                  format: uuid
                edgeType:
                  type: string
                  enum:
                  - chain
                  - suggestion
                  - loop
                  - branch
      responses:
        '200':
          description: Updated source experience
  /api/experiences/{id}/steps:
    get:
      operationId: getExperienceSteps
      summary: Get all steps for an experience
      description: Returns the ordered sequence of steps for this experience.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Array of steps
    post:
      operationId: addExperienceStep
      summary: Add a new step to an existing experience
      description: Appends a new step dynamically to the experience instance.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - type
              - title
              - payload
              properties:
                type:
                  type: string
                title:
                  type: string
                payload:
                  type: object
                  additionalProperties: true
                completion_rule:
                  type: string
                  nullable: true
      responses:
        '201':
          description: Created step
  /api/experiences/{id}/steps/{stepId}:
    get:
      operationId: getExperienceStep
      summary: Get a single step by ID
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      - name: stepId
        in: path
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Single step record
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExperienceStepRecord'
        '404':
          description: Step not found
    patch:
      operationId: updateExperienceStep
      summary: Update a step's title, payload, or scheduling fields
      description: 'Use this for multi-pass enrichment — update step content after
        initial creation. Can update title, payload, completion_rule, scheduled_date,
        due_date, and estimated_minutes.

        '
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      - name: stepId
        in: path
        required: true
        schema:
          type: string
          format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title:
                  type: string
                payload:
                  type: object
                  additionalProperties: true
                completion_rule:
                  type: string
                  nullable: true
                scheduled_date:
                  type: string
                  format: date
                  nullable: true
                  description: Suggested date to work on this step
                due_date:
                  type: string
                  format: date
                  nullable: true
                  description: Deadline for step completion
                estimated_minutes:
                  type: integer
                  nullable: true
                  description: Estimated time in minutes
      responses:
        '200':
          description: Updated step
        '404':
          description: Step not found
    delete:
      operationId: deleteExperienceStep
      summary: Remove a step from an experience
      description: Removes a step and re-indexes remaining step_order values.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      - name: stepId
        in: path
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Step deleted
        '404':
          description: Step not found
  /api/experiences/{id}/steps/reorder:
    post:
      operationId: reorderExperienceSteps
      summary: Reorder steps within an experience
      description: Provide the full ordered array of step IDs. Steps will be re-indexed
        to match the new order.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - stepIds
              properties:
                stepIds:
                  type: array
                  items:
                    type: string
                    format: uuid
                  description: Ordered array of step IDs defining the new sequence
      responses:
        '200':
          description: Steps reordered
        '400':
          description: Invalid step IDs
  /api/experiences/{id}/steps/progress:
    get:
      operationId: getExperienceProgress
      summary: Get progress summary for an experience
      description: Returns completion percentage, step counts by status, and estimated
        remaining time.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Progress summary
          content:
            application/json:
              schema:
                type: object
                properties:
                  totalSteps:
                    type: integer
                  completedSteps:
                    type: integer
                  skippedSteps:
                    type: integer
                  completionPercentage:
                    type: number
                  estimatedRemainingMinutes:
                    type: integer
                    nullable: true
  /api/drafts:
    get:
      operationId: getDraft
      summary: Get a saved draft for a specific step
      description: 'Retrieves the most recent draft artifact for a step. Drafts auto-save
        as the user types and persist across sessions.

        '
      parameters:
      - name: instanceId
        in: query
        required: true
        schema:
          type: string
          format: uuid
      - name: stepId
        in: query
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Draft data
          content:
            application/json:
              schema:
                type: object
                properties:
                  draft:
                    type: object
                    nullable: true
                    description: The saved draft payload, or null if no draft exists
    post:
      operationId: saveDraft
      summary: Save or update a draft for a step
      description: Upserts a draft artifact. Use for auto-save during user input.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - instanceId
              - stepId
              - data
              properties:
                instanceId:
                  type: string
                  format: uuid
                stepId:
                  type: string
                  format: uuid
                data:
                  type: object
                  additionalProperties: true
                  description: The draft content to save
      responses:
        '200':
          description: Draft saved
  /api/experiences/{id}/suggestions:
    get:
      operationId: getExperienceSuggestions
      summary: Get suggested next experiences
      description: Returns templated suggestions based on graph mappings and completions.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Array of suggestions
components:
  schemas:
    Resolution:
      type: object
      required:
      - depth
      - mode
      - timeScope
      - intensity
      properties:
        depth:
          type: string
          enum:
          - light
          - medium
          - heavy
          description: light = minimal chrome, medium = progress bar + title, heavy
            = full header with goal
        mode:
          type: string
          enum:
          - illuminate
          - practice
          - challenge
          - build
          - reflect
          description: illuminate = learn, practice = do, challenge = push, build
            = create, reflect = think
        timeScope:
          type: string
          enum:
          - immediate
          - session
          - multi_day
          - ongoing
          description: How long this experience is expected to take
        intensity:
          type: string
          enum:
          - low
          - medium
          - high
          description: How demanding the experience is
    ReentryContract:
      type: object
      required:
      - trigger
      - prompt
      - contextScope
      properties:
        trigger:
          type: string
          enum:
          - time
          - completion
          - inactivity
          - manual
          description: When the re-entry should fire
        prompt:
          type: string
          description: What you (GPT) should say or propose when re-entering
        contextScope:
          type: string
          enum:
          - minimal
          - full
          - focused
          description: How much context to load for re-entry
    ExperienceStep:
      type: object
      required:
      - type
      - title
      - payload
      properties:
        type:
          type: string
          enum:
          - questionnaire
          - lesson
          - challenge
          - plan_builder
          - reflection
          - essay_tasks
          description: The renderer type for this step
        title:
          type: string
          description: Step title shown to the user
        payload:
          type: object
          additionalProperties: true
          description: Step-specific content. Format depends on type.
        completion_rule:
          type: string
          nullable: true
          description: Optional rule for when this step counts as complete
    ExperienceStepRecord:
      type: object
      description: A saved experience step as stored in the database
      properties:
        id:
          type: string
          format: uuid
        instance_id:
          type: string
          format: uuid
        step_order:
          type: integer
          description: 0-indexed position of this step in the experience
        step_type:
          type: string
          enum:
          - questionnaire
          - lesson
          - challenge
          - plan_builder
          - reflection
          - essay_tasks
        title:
          type: string
        payload:
          type: object
        completion_rule:
          type: string
          nullable: true
        status:
          type: string
          enum:
          - pending
          - active
          - completed
          - skipped
          description: Step completion status (default pending)
        scheduled_date:
          type: string
          format: date
          nullable: true
          description: Suggested date to work on this step
        due_date:
          type: string
          format: date
          nullable: true
          description: Deadline for step completion
        estimated_minutes:
          type: integer
          nullable: true
          description: Estimated time to complete in minutes
        completed_at:
          type: string
          format: date-time
          nullable: true
          description: Timestamp when the step was completed
    InjectEphemeralRequest:
      type: object
      required:
      - templateId
      - userId
      - resolution
      - steps
      properties:
        templateId:
          type: string
          description: Template ID (see template list in instructions)
        userId:
          type: string
          default: a0000000-0000-0000-0000-000000000001
        title:
          type: string
          description: Experience title
        goal:
          type: string
          description: What this experience achieves
        resolution:
          $ref: '#/components/schemas/Resolution'
        steps:
          type: array
          items:
            $ref: '#/components/schemas/ExperienceStep'
          minItems: 1
    CreatePersistentRequest:
      type: object
      required:
      - templateId
      - userId
      - resolution
      - steps
      properties:
        templateId:
          type: string
          description: Template ID (see template list in instructions)
        userId:
          type: string
          default: a0000000-0000-0000-0000-000000000001
        title:
          type: string
          description: Experience title
        goal:
          type: string
          description: What this experience achieves
        resolution:
          $ref: '#/components/schemas/Resolution'
        reentry:
          $ref: '#/components/schemas/ReentryContract'
        previousExperienceId:
          type: string
          nullable: true
          description: ID of the experience this follows in a chain
        steps:
          type: array
          items:
            $ref: '#/components/schemas/ExperienceStep'
          minItems: 1
    ExperienceInstance:
      type: object
      properties:
        id:
          type: string
          format: uuid
        user_id:
          type: string
        template_id:
          type: string
        title:
          type: string
        goal:
          type: string
        instance_type:
          type: string
          enum:
          - persistent
          - ephemeral
        status:
          type: string
          enum:
          - proposed
          - drafted
          - ready_for_review
          - approved
          - published
          - active
          - completed
          - archived
          - superseded
          - injected
        resolution:
          $ref: '#/components/schemas/Resolution'
        reentry:
          $ref: '#/components/schemas/ReentryContract'
          nullable: true
        previous_experience_id:
          type: string
          nullable: true
        next_suggested_ids:
          type: array
          items:
            type: string
        friction_level:
          type: string
          enum:
          - low
          - medium
          - high
          nullable: true
        created_at:
          type: string
          format: date-time
        published_at:
          type: string
          format: date-time
          nullable: true
    GPTStatePacket:
      type: object
      properties:
        latestExperiences:
          type: array
          items:
            $ref: '#/components/schemas/ExperienceInstance'
          description: Recent experience instances
        activeReentryPrompts:
          type: array
          items:
            type: object
            properties:
              instanceId:
                type: string
              instanceTitle:
                type: string
              prompt:
                type: string
              trigger:
                type: string
              contextScope:
                type: string
          description: Active re-entry prompts from completed or idle experiences
        frictionSignals:
          type: array
          items:
            type: object
            properties:
              instanceId:
                type: string
              level:
                type: string
                enum:
                - low
                - medium
                - high
          description: Friction levels observed in recent experiences
        suggestedNext:
          type: array
          items:
            type: string
          description: Suggested next experience IDs
        synthesisSnapshot:
          $ref: '#/components/schemas/SynthesisSnapshot'
          nullable: true
        proposedExperiences:
          type: array
          items:
            $ref: '#/components/schemas/ExperienceInstance'
          description: Experiences in proposed status awaiting user acceptance
        compressedState:
          type: object
          nullable: true
          properties:
            narrative:
              type: string
              description: A concise narrative summary of the user's current situation and progress.
            prioritySignals:
              type: array
              items:
                type: string
              description: The top 3-5 signals the GPT should pay attention to.
            suggestedOpeningTopic:
              type: string
              description: A recommended opening topic or question for the GPT to use when re-entering the conversation.
          description: AI-generated narrative compression of the user's state.
    SynthesisSnapshot:
      type: object
      properties:
        id:
          type: string
        user_id:
          type: string
        source_type:
          type: string
        source_id:
          type: string
        summary:
          type: string
        key_signals:
          type: object
        next_candidates:
          type: array
          items:
            type: string
        created_at:
          type: string
    Idea:
      type: object
      description: 'An idea captured from conversation. Note: all fields use snake_case.'
      properties:
        id:
          type: string
        title:
          type: string
        raw_prompt:
          type: string
          description: The raw text from the conversation that triggered this idea
        gpt_summary:
          type: string
          description: GPT's structured summary of the idea
        vibe:
          type: string
          description: The energy or feel of the idea
        audience:
          type: string
          description: Who this idea is for
        intent:
          type: string
          description: What the user wants to achieve
        status:
          type: string
          enum:
          - captured
          - drilling
          - arena
          - icebox
          - shipped
          - killed
        created_at:
          type: string
          format: date-time
    CaptureIdeaRequest:
      type: object
      description: Accepts both camelCase and snake_case field names. The normalizer
        handles both.
      required:
      - title
      - rawPrompt
      - gptSummary
      properties:
        title:
          type: string
          description: Short idea title
        rawPrompt:
          type: string
          description: The raw text from the conversation that triggered this idea.
            Quote or paraphrase what the user said. (Also accepts raw_prompt)
        gptSummary:
          type: string
          description: "Your structured summary of the idea \u2014 what it is, why\
            \ it matters, what it could become. (Also accepts gpt_summary)"
        vibe:
          type: string
          description: "The energy or feel \u2014 e.g. 'ambitious', 'playful', 'urgent',\
            \ 'exploratory'"
        audience:
          type: string
          description: "Who this idea is for \u2014 e.g. 'self', 'team', 'public'"
        intent:
          type: string
          description: "What the user wants from this \u2014 e.g. 'explore', 'build',\
            \ 'learn', 'solve'"
    RecordInteractionRequest:
      type: object
      required:
      - instanceId
      - eventType
      properties:
        instanceId:
          type: string
          description: Experience instance ID
        stepId:
          type: string
          nullable: true
          description: Step ID if the event is step-specific
        eventType:
          type: string
          enum:
          - step_viewed
          - answer_submitted
          - task_completed
          - step_skipped
          - time_on_step
          - experience_started
          - experience_completed
          - draft_saved
        eventPayload:
          type: object
          description: Event-specific data
    KnowledgeUnit:
      type: object
      required:
        - id
        - topic
        - domain
        - title
        - thesis
        - content
      properties:
        id:
          type: string
        topic:
          type: string
        domain:
          type: string
        unit_type:
          type: string
          enum: [foundation, playbook, deep_dive, example]
        title:
          type: string
        thesis:
          type: string
        content:
          type: string
          description: The full, dense, high-density research content.
        key_ideas:
          type: array
          items:
            type: string
        citations:
          type: array
          items:
            $ref: '#/components/schemas/KnowledgeCitation'
        retrieval_questions:
          type: array
          items:
            $ref: '#/components/schemas/RetrievalQuestion'
        mastery_status:
          type: string
          enum: [unseen, read, practiced, confident]
        created_at:
          type: string
          format: date-time
    KnowledgeCitation:
      type: object
      properties:
        url:
          type: string
        claim:
          type: string
        confidence:
          type: number
    RetrievalQuestion:
      type: object
      properties:
        question:
          type: string
        answer:
          type: string
        difficulty:
          type: string
          enum: [easy, medium, hard]

```

### docs/contracts/goal-os-contract.md

```markdown
# Goal OS Contract — v1

> Sprint 13 Gate 0 — Canonical reference for all lane agents.

---

## Entity Hierarchy

```
Goal
├── SkillDomain (1:N — each goal has multiple competency areas)
│   ├── KnowledgeUnit (M:N — via linked_unit_ids)
│   └── ExperienceInstance (M:N — via linked_experience_ids)
└── CurriculumOutline (1:N — via goal_id FK)
    └── CurriculumSubtopic (1:N — embedded JSONB)
        └── ExperienceInstance (1:1 — via experienceId)
```

**Key relationships:**
- A **Goal** contains multiple **SkillDomains** and multiple **CurriculumOutlines**
- A **SkillDomain** aggregates evidence from linked **KnowledgeUnits** and **ExperienceInstances**
- A **CurriculumOutline** can optionally belong to a Goal (via `goal_id` FK). The FK on `curriculum_outlines.goal_id` is the single source of truth for this relationship.

---

## Goal Lifecycle

```
intake → active → completed → archived
           ↕
         paused
```

| Transition | Action | Trigger |
|-----------|--------|---------|
| intake → active | `activate` | First CurriculumOutline linked to goal |
| active → paused | `pause` | User explicitly pauses |
| paused → active | `resume` | User explicitly resumes |
| active → completed | `complete` | All linked skill domains reach `practicing` or higher |
| completed → archived | `archive` | User archives a completed goal |

**Rules:**
- Only one goal may be in `active` status at a time per user (enforced at service level, not DB constraint)
- Goals in `intake` status are ephemeral — they exist between GPT creating them and the first outline being attached
- `paused` goals retain all domain mastery but stop influencing GPT re-entry

---

## Skill Domain Mastery Levels

```
undiscovered → aware → beginner → practicing → proficient → expert
```

### Mastery Computation Rules

Mastery is computed from **evidence_count** — the sum of completed experiences and confident knowledge units linked to the domain.

| Level | Evidence Required |
|-------|------------------|
| `undiscovered` | 0 evidence (default) |
| `aware` | 1+ linked knowledge unit OR experience (any status) |
| `beginner` | 1+ completed experience linked to domain |
| `practicing` | 3+ completed experiences linked to domain |
| `proficient` | 5+ completed experiences AND 2+ knowledge units at `confident` mastery |
| `expert` | 8+ completed experiences AND all linked knowledge units at `confident` |

**Rules:**
- Mastery is **monotonically increasing** within a goal lifecycle — it never decreases
- Mastery recomputation is triggered by:
  1. Experience completion (ExperienceRenderer completion handler)
  2. Knowledge unit mastery promotion (grade route)
  3. Manual recomputation via admin/debug API
- `evidence_count` is persisted on the domain row to avoid recomputation on every read
- Recomputation reads linked experience statuses and linked knowledge unit mastery statuses from their respective tables

---

## DB Schema (Migration 008)

### `goals` table

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | PK |
| user_id | UUID | — | NOT NULL, no FK (auth not yet implemented) |
| title | TEXT | — | NOT NULL |
| description | TEXT | '' | |
| status | TEXT | 'intake' | GoalStatus enum |
| domains | JSONB | '[]' | Denormalized domain name strings |
| created_at | TIMESTAMPTZ | now() | |
| updated_at | TIMESTAMPTZ | now() | |

### `skill_domains` table

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | PK |
| user_id | UUID | — | NOT NULL |
| goal_id | UUID | — | FK → goals(id) ON DELETE CASCADE |
| name | TEXT | — | NOT NULL |
| description | TEXT | '' | |
| mastery_level | TEXT | 'undiscovered' | SkillMasteryLevel enum |
| linked_unit_ids | JSONB | '[]' | Knowledge unit UUIDs |
| linked_experience_ids | JSONB | '[]' | Experience instance UUIDs |
| evidence_count | INTEGER | 0 | Cached computation |
| created_at | TIMESTAMPTZ | now() | |
| updated_at | TIMESTAMPTZ | now() | |

### `curriculum_outlines` table (ALTER)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| goal_id | UUID | NULL | FK → goals(id) ON DELETE SET NULL, nullable |

---

## GPT Re-entry Extension

When a goal is active, GPT re-entry context includes:

```json
{
  "active_goal": {
    "id": "...",
    "title": "Learn systems programming",
    "status": "active",
    "domain_count": 4
  },
  "skill_domains": [
    { "name": "Memory Management", "mastery_level": "beginner" },
    { "name": "Concurrency", "mastery_level": "undiscovered" },
    { "name": "OS Internals", "mastery_level": "aware" },
    { "name": "Compiler Design", "mastery_level": "undiscovered" }
  ]
}
```

**Re-entry rules:**
- GPT should suggest the **highest-leverage next domain** — typically the lowest mastery level that has research/knowledge available
- If all domains are at `practicing` or above, GPT should suggest **deepening** the weakest domain
- If a domain is `undiscovered` and has no linked knowledge, GPT should suggest dispatching MiraK research first

---

## Service Patterns

All services follow the established pattern from `curriculum-outline-service.ts`:
- `fromDB(row)` / `toDB(entity)` normalization
- `getStorageAdapter()` for all DB access
- `generateId()` from `lib/utils.ts` for UUIDs
- Lazy-import validators to avoid circular dependencies

---

## Cross-references

- Types: `types/goal.ts`, `types/skill.ts`
- Constants: `lib/constants.ts` (GOAL_STATUSES, SKILL_MASTERY_LEVELS)
- State machine: `lib/state-machine.ts` (GOAL_TRANSITIONS)
- Migration: `lib/supabase/migrations/008_goal_os.sql`

```

### docs/contracts/v1-experience-contract.md

```markdown
# v1 Experience Contract — Reference

> Canonical contract for Sprint 5B lanes. Validators (L4) and renderers (L5) must depend only on contracted fields.

## Contract Files

| File | Contains |
|------|----------|
| `lib/contracts/experience-contract.ts` | Instance contract, versioning strategy, module roles |
| `lib/contracts/step-contracts.ts` | Step base, 6 payload contracts, fallback policy |
| `lib/contracts/resolution-contract.ts` | Resolution, re-entry, chrome mapping |

---

## Field Stability

| Level | Meaning | Example |
|-------|---------|---------|
| `@stable` | Will not change within v1 | `id`, `user_id`, `title`, `previous_experience_id`, `next_suggested_ids` |
| `@evolving` | May gain new valid values | `instance_type` may add `'scheduled'`, `reentry.trigger` may add new types like `manual` / `time` |
| `@computed` | System-written, read-only to creators | `friction_level` |

---

## Contracted Step Types

| Step Type | Payload Interface | Module Role | Key Fields |
|-----------|------------------|-------------|------------|
| `questionnaire` | `QuestionnairePayloadV1` | `capture` | `questions[].{id, label, type, options?}` |
| `lesson` | `LessonPayloadV1` | `deliver` | `sections[].{heading?, body, type?}` |
| `challenge` | `ChallengePayloadV1` | `activate` | `objectives[].{id, description, proof_required?}` |
| `reflection` | `ReflectionPayloadV1` | `synthesize` | `prompts[].{id, text, format?}` |
| `plan_builder` | `PlanBuilderPayloadV1` | `plan` | `sections[].{type, title?, items[]}` |
| `essay_tasks` | `EssayTasksPayloadV1` | `produce` | `content, tasks[].{id, description, done?}` |

---

## Versioning Rules

1. Step payloads may carry an optional `v` field (top-level, not wrapped).
2. Absent `v` = v1.
3. Unknown future `v` → validators pass-through with warning; renderers fall back to `FallbackStep`.
4. New fields additive-only within same version. Remove/rename = version bump.

## Unknown Step Policy

`pass-through-with-fallback` — validators pass unknown types, renderers use `FallbackStep`.

## Resolution → Chrome

| Depth | Header | Progress | Goal |
|-------|--------|----------|------|
| `light` | ✗ | ✗ | ✗ |
| `medium` | ✗ | ✓ | ✗ |
| `heavy` | ✓ | ✓ | ✓ |

## Lane Rules

- **Lane 4**: Import contracts from `lib/contracts/`. Validate only contracted fields. Pass unknown step types. Respect `v` field.
- **Lane 5**: Render only contracted payload fields. Use `RESOLUTION_CHROME_MAP`. Fall back for unknown types.
- **Lanes 1–3**: Use `ModuleRole` and `MODULE_ROLE_LABELS` for capability-oriented labeling. Don't hard-code step type names in display logic.

```

### docs/future-ideas.md

```markdown
# Future Ideas

## Auth layer
- Simple auth via NextAuth or a custom JWT approach
- Single-user initially (it's a personal studio)

## Real GitHub integration
- Replace mock adapter with actual GitHub API calls
- Issue creation from tasks
- PR status via webhooks

## Real Vercel integration
- Deployment status via Vercel API
- Preview URL auto-detection

## Persistence
- Replace in-memory arrays with a real DB (Turso/PlanetScale/Postgres)
- Or use Vercel KV for simple key/value storage

## AI features
- GPT summary of drill session
- Auto-task generation from project scope
- Intelligent staleness warnings

```

### docs/page-map.md

```markdown
# Page Map

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomePage | Dashboard / redirect |
| `/send` | SendPage | Review captured idea |
| `/drill` | DrillPage | 6-step definition flow |
| `/drill/success` | DrillSuccessPage | Materialization sequence |
| `/drill/end` | DrillEndPage | Idea ended — preserves to Graveyard |
| `/arena` | ArenaPage | Active projects list |
| `/arena/[id]` | ArenaProjectPage | Three-pane project view |
| `/icebox` | IceboxPage | Deferred items |
| `/shipped` | ShippedPage | Trophy room |
| `/killed` | KilledPage | Graveyard |
| `/review/[id]` | ReviewPage | PR review |
| `/inbox` | InboxPage | Event feed |

```

### docs/product-overview.md

```markdown
# Mira Studio — Product Overview

Mira is a Vercel-hosted Studio UI for managing ideas from conception through execution.

## The problem

Ideas die in chat. They get lost, deprioritized, or never defined clearly enough to build.

## The solution

A five-zone system that forces every idea through a decision:

1. **Send** — Ideas arrive from GPT via webhook.
2. **Drill** — 6 questions force clarity before commitment.
3. **Arena** — Active projects (max 3) with task and PR visibility.
4. **Icebox** — Deferred ideas with a staleness timer.
5. **Archive** — Trophy Room (shipped) and Graveyard (removed).

## The rule

No limbo. Every idea is in play, frozen, or gone.

```

### docs/state-model.md

```markdown
# State Model

## Idea states

```
captured → drilling → arena
captured → icebox
captured → killed
drilling → icebox
drilling → killed
```

## Project states

```
arena → shipped
arena → killed
arena → icebox
icebox → arena
icebox → killed
```

## The no-limbo rule

Every idea or project must be in exactly one state. No ambiguity.

```

### docs/ui-principles.md

```markdown
# UI Principles

## Dark, dense, functional

- Background: `#0a0a0f` (near black)
- Surface: `#12121a`
- Borders: `#1e1e2e`
- Text: `#e2e8f0`
- Muted: `#94a3b8`
- Accent: `#6366f1` (indigo)

## No chrome

Minimize decoration. Every element earns its place.

## Keyboard first

Cmd+K command bar. Enter to advance in drill. ESC to dismiss.

## Mobile aware

Sidebar on desktop, bottom nav on mobile.

```

### enrichment.md

```markdown
# Mira Enrichment — Curriculum-Aware Experience Engine

> Strategic design document. No code. This is the master thesis for how Mira evolves from an experience tool into a coherent adaptive learning system.

---

## Master Thesis

**Mira should evolve into a curriculum-aware experience engine where planning scopes the curriculum, knowledge arrives in context, and GPT operates through a small gateway + discovery layer instead of carrying an ever-growing schema in its prompt.**

The experience system is already the classroom shell. What is missing is a **planning layer before generation**, a **contextual knowledge layer during learning**, and a **smart gateway layer between GPT and the backend** so the system can scale without collapsing under prompt/schema complexity.

The core failure today is not that experiences are the wrong mechanism. The failure is that they are being generated too early — before the system has scoped the learning problem, sized the subject, split broad domains into teachable sections, or decided when knowledge should appear. That is why dense MiraK output feels premature and why large topics collapse into a few giant steps with shallow touchpoints.

The path forward is not a rebuild. It is a **generation-order correction** plus a **connection-architecture correction**.

---

## The Three Pillars

### 1. Planning-First Generation
Planning happens before serious experience creation. A curriculum outline scopes the learning problem first.

### 2. Context-Timed Knowledge
MiraK knowledge is linked to the outline and delivered as support at the right point in the experience, not dumped first.

### 3. Gateway-Based Progressive Discovery for GPT
GPT connects through a small set of compound gateway endpoints plus a discovery endpoint, so the system scales without prompt bloat or schema explosion.

These three are equally important. The third is not plumbing — it is what lets the first two evolve at all.

---

## What We Already Have

These primitives are not obsolete. They are the right bones:

| Primitive | Current State | Role in Curriculum |
|-----------|--------------|-------------------|
| Chat (GPT) | Discovery + experience authoring | Discovery / feeler sessions |
| Experiences | 6 step types, persistent + ephemeral | The classroom shell |
| Knowledge (MiraK) | Foundation, playbook, audio scripts | Contextual support material |
| Multi-pass enrichment | Step CRUD, reorder, insert APIs | Curriculum refinement tool |
| Re-entry contracts | Trigger + prompt + contextScope | Adaptive teaching moments |
| Drafts | Auto-save to artifacts table | In-progress work persistence |
| Step scheduling | scheduled_date, due_date, estimated_minutes | Pacing across sessions |
| Knowledge Companion | Collapsible domain-linked panel | In-step knowledge delivery |
| Graph + chaining | previous_experience_id + next_suggested_ids | Broad domain handling |
| Progression rules | Chain map (lesson → challenge → reflection) | Learning sequence logic |

The problem is not the primitives. The problem is that broad subjects are being compressed into experience objects before the system has properly scoped them. A topic like "understanding business" turns into a few giant steps instead of a real curriculum because **no planning happened first**.

---

## Pillar 1: Planning-First Generation

### The Core Model

The correct sequence is:

```
Chat discovers → Planning scopes → Experience teaches →
Knowledge supports → Iteration deepens → Learning surface compounds
```

### Current Flow (broken)
```
GPT chat → vibes → experience (too big, too vague, no scope)
```

### Correct Flow
```
1. DISCOVER    — Chat finds the real problem, level, friction, direction
2. PLAN        — System creates a structured outline of the learning problem
3. GENERATE    — Experience is authored from the outline, not from the chat
4. SUPPORT     — Knowledge arrives contextually alongside the active step
5. DEEPEN      — Later passes inspect user work for gaps and resize the curriculum
```

This is a **generation order** change, not a system replacement.

### Phase 1: Discovery / Feeler Session

The user talks naturally in chat. GPT listens for:
- The real problem (not the stated problem)
- Current level (beginner? has context? false confidence?)
- Friction signals (overwhelmed? bored? stuck?)
- Desired direction (learn? build? explore? fix?)

GPT does NOT create an experience yet. It stays in discovery mode until it has enough signal to scope.

**What changes in GPT instructions:** A new behavioral rule — before creating any multi-step experience, GPT must complete at least one assessment pass. For ephemeral micro-nudges, the current instant-fire behavior stays unchanged.

### Phase 2: The Planning Layer

Before any serious experience is generated, the system creates a **curriculum outline** — a structured artifact that sizes and sequences the learning problem.

This outline is where the system decides:
- What the actual topic is
- What subtopics exist inside it
- What is too broad for a single experience
- What is too narrow to stand alone
- What needs evidence from the user before it becomes curriculum
- What order makes sense
- What knowledge already exists (existing units) vs. what needs research

#### What It Is NOT

- Not a full LMS course object
- Not a user-facing "Course Page" they enroll in
- Not a rigid syllabus that can't adapt
- Not a replacement for GPT's judgment

It's a **scoping artifact** — the system's working document that prevents the "giant vague experience" failure mode.

#### The Planner's Real Job

The planner is not there to produce a perfect course. Its job is to size and sequence the learning problem well enough to create the **first good experience**.

The planner should judge topics by questions like:
- Is this too broad for one module?
- Is this too small to stand alone?
- Is this actually multiple subtopics hiding inside one phrase?
- Does the user need a feeler step before we formalize this?
- Does this require real-world evidence before teaching can deepen?

This is the missing judgment layer.

#### Research Follows Planning

Research (MiraK) fires **after** planning identifies gaps — not before, not randomly.

```
Planning identifies gaps → GPT dispatches generateKnowledge for uncovered subtopics
  → "Research running on [X]. It'll land in your Knowledge tab."
  → GPT moves on, doesn't wait
  → When research lands, it's linked to the outline's subtopics
```

This makes research a consequence of planning, not a random side-trigger.

### Phase 3: Experience Generation — From Outline, Not From Chat

#### What Experiences Become

Experiences stay central, but their role becomes more precise.

An experience is **not the whole subject**.
An experience is **one right-sized section of a curriculum**.

That means:
- Broad domains should become multiple linked experiences
- The first experience after planning should be workbook-style and evidence-seeking
- Experiences should create usable signals for later deepening
- Graph/chaining should handle broad domains instead of cramming everything into one object

So "understanding business" should never be one giant module. It should be a curriculum outline that yields separate right-sized experiences: revenue models, unit economics, cash flow vs. profit — each linked to the next.

#### What "Right-Sized" Means

A right-sized experience:
- Covers one subtopic from the outline (not the whole topic)
- Has 3-6 steps (not 18)
- Can be completed in 1-2 sessions
- Creates evidence the system can use to deepen the curriculum later
- Chains to the next experience in the outline's sequence

#### The First Experience Should Change

The first experience generated after planning should feel more like a **workbook** than a static lesson sequence. It should ask the user to:
- Observe real systems
- Collect evidence
- Describe what they found
- Compare expectation versus reality
- Return with material the system can use to deepen the curriculum

That is how the product stops being chat-shaped and starts becoming real learning.

### Phase 5: Iteration / Deepening — Multi-Pass as Curriculum Refinement

Multi-pass is not optional polish. It is the core curriculum tool.

#### Pass 1: Initial Generation
Creates the outline-backed experience. Right-sized. First workbook.

#### Pass 2: Adaptive Inspection
Checks whether user responses are:
- **Too broad** → splits steps into smaller units
- **Too shallow** → adds depth (new lesson sections, deeper challenges)
- **Too vague** → adds scaffolding (pre-support knowledge, guided prompts)
- **False confidence** → adds checkpoints that test real understanding
- **Too narrow** → merges steps or links to broader context

#### Pass 3+: Evidence-Based Deepening
Continues shaping the curriculum based on evidence from actual use:
- Tutor conversation signals (confusion on specific concepts)
- Checkpoint results (which questions were missed)
- Challenge completion quality (proof text analysis)
- Reflection depth (did the user just phone it in?)
- Re-entry signals (did they come back? how quickly?)

#### Re-Entry as Adaptive Teaching

Re-entry should not just remind the user what to do next. It becomes the moment where the system asks:
- What is still unclear?
- Where is the friction?
- What concept needs to be broken apart?
- What should now become its own sub-experience?

This means the re-entry contract gets richer. GPT reads the accumulated evidence (tutor exchanges, checkpoint results, completion signals) and decides whether to continue the sequence, split a subtopic into its own experience, or adjust the intensity.

### How Graph/Chaining Handles Broad Domains

If a subject is too broad for one experience, do not overstuff the original object. Instead:

```
Curriculum Outline: "Business Fundamentals"
  ├── Experience 1: "Revenue Models" (right-sized, 4 steps)
  │     └── chains to →
  ├── Experience 2: "Unit Economics" (right-sized, 5 steps)
  │     └── chains to →
  ├── Experience 3: "Cash Flow vs Profit" (right-sized, 4 steps)
  │     └── chains to →
  └── Experience 4: "Competitive Moats" (right-sized, 5 steps)
```

Each experience uses `previous_experience_id` and `next_suggested_ids` — fields that already exist. The curriculum outline is the parent that ties them together. The user feels a track without forcing an LMS-like course structure.

---

## Pillar 2: Context-Timed Knowledge

### What Knowledge Becomes

Knowledge should stop being the front door.

MiraK's density is not a flaw. Its density becomes an advantage **once planning decides where that density belongs**. The system should use the outline to decide which unit belongs to which subtopic and which step. Then the user gets the right slice at the right time, with the option to open the full unit only when context exists.

### Four Modes of Knowledge Delivery

#### 1. Pre-Support
A small amount of knowledge appears **before** a task when the user needs just enough context to act.

Implementation: The experience step's `knowledge_unit_id` link triggers the existing `KnowledgeCompanion` to show a thesis + "Read more →" before the step content renders. Not a dump — a teaser.

#### 2. In-Step Support (Genkit Tutoring)
A relevant knowledge unit is available **beside** the current step as a conversational companion.

This is where Genkit comes in. Not as a full chatbot, but as a **scoped, contextual Q&A surface**:
- It knows which step the user is on
- It knows the step's payload content
- It knows the linked knowledge unit
- It can answer questions about *this specific content*
- It can pose checkpoint questions ("Before you move on — can you explain X in your own words?")

This is an evolution of the existing `KnowledgeCompanion` — from a read-only expandable panel to a conversational one, powered by Genkit.

#### 3. Post-Action Deepening
After the user has completed a step, deeper knowledge appears because the user now has context to absorb it.

Implementation: On step completion, if the step has a `knowledge_unit_id`, the system surfaces the full knowledge unit content (not just thesis) and any linked playbook or deep-dive units. The user has done the work — now the reference material means something.

#### 4. Curriculum Memory
As experiences accumulate, linked knowledge becomes part of the broader learning surface and supports compounding.

Implementation: The Knowledge Tab already groups by domain. Adding `curriculum_outline_id` to knowledge units lets the system group them by curriculum track as well. "These 4 units support your Business Fundamentals track."

### Richer Step Types Within the Experience Frame

Experiences should remain the main vehicle, but not every learning action has to look like a standard lesson, reflection, or challenge. Some domains need richer modes of work.

#### `checkpoint` — A New Step Type

The existing `lesson` delivers content but can't test it. The existing `questionnaire` collects answers but isn't tied to knowledge verification.

`checkpoint` is purpose-built for curriculum-aware experiences:

```ts
interface CheckpointPayloadV1 {
  v?: number;
  knowledge_unit_id: string;
  questions: CheckpointQuestion[];
  passing_threshold: number;
  on_fail: 'retry' | 'continue' | 'tutor_redirect';
}

interface CheckpointQuestion {
  id: string;
  question: string;
  expected_answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  format: 'free_text' | 'choice';
  options?: string[];
}
```

Why it's different from `questionnaire`:
- It's **graded** (questionnaire is freeform capture)
- It's **linked to a knowledge unit** (questionnaire is standalone)
- It has **consequences** (fail → retry or tutor, not just "submitted")
- Completion signals feed **back to knowledge mastery**

#### Future Step Types (Not Now, But Within Frame)

When domains demand them, these could become new step types — not new systems:

| Mode | What It Is | When Needed |
|------|-----------|-------------|
| `field_study` | Observe real systems, collect evidence, report back | When the user needs to ground theory in reality |
| `practice_ladder` | Graduated difficulty exercises within one domain | When a skill needs repetition, not more reading |
| `comparison_map` | Side-by-side analysis of options/approaches | When the user needs to evaluate, not just learn |
| `case_breakdown` | Analyze a real example in depth | When theory needs a specific anchor |
| `evidence_collection` | Gather proof from the user's own world | When the curriculum needs real-world input to continue |

These are step types, not experience types. They live inside the experience frame. The experience system doesn't need to know about classrooms — it needs richer step vocabulary.

### Genkit's Role: Conversational Intelligence Inside Steps

#### The TutorChat Pattern

Not a full chatbot. A scoped conversational surface available on steps that have linked knowledge units.

```
StepRenderer (any type)
  ├── [existing step UI]
  └── TutorChat (collapsible panel — evolution of KnowledgeCompanion)
        ├── Context: step payload + linked knowledge unit content
        ├── Genkit flow: tutorChatFlow
        ├── Conversation persists to interaction_events (type: 'tutor_exchange')
        └── Signals feed back to mastery assessment
```

#### When Available
- The step has a `knowledge_unit_id` link (there's content to tutor on)
- The user explicitly opens it (not forced — opt-in via the companion toggle)

When unavailable, the existing read-only `KnowledgeCompanion` stays as-is.

#### Genkit Flows

| Flow | Purpose | Input | Output |
|------|---------|-------|--------|
| `tutorChatFlow` | Contextual Q&A within a step | step context + knowledge unit + conversation history + user message | response + mastery signal |
| `gradeCheckpointFlow` | Semantic grading of free-text answers | question + expected answer + user answer + unit context | correct + feedback + misconception |
| `assessMasteryFlow` | Evidence-based mastery verdict on completion | linked unit IDs + all interactions + current mastery | mastery updates + recommended next |

### Visual Treatment: Workbook Feel

When an experience is curriculum-linked (has a `curriculum_outline_id`):
- **Header accent**: Warm amber/gold instead of default indigo — signals "this is a study space"
- **Step transitions**: Softer, page-turn feel
- **Overview**: Shows curriculum track position ("Module 2 of 4: Unit Economics")
- **Completion**: Shows mastery delta ("You moved from *unseen* to *practiced* on 3 concepts")

This is a CSS-level treatment driven by a single boolean (`isCurriculumLinked`), not a new experience class.

---

## Pillar 3: Smart Gateway Architecture

### The Problem: Schema Explosion

The OpenAPI schema (`public/openapi.yaml`) is **1,309 lines** with **20+ endpoints**. The GPT instructions are **155 lines** dense with payload schemas, template IDs, lifecycle rules, step format definitions, and behavioral guidance. And we're about to add curriculum outlines, tutor chat, checkpoint grading, mastery assessment, and more.

The current approach — "expose every operation as its own endpoint with full schema" — does not scale.

### Why It's Broken

The real issue isn't the number of endpoints. It's that **GPT has to know everything upfront**.

Right now, to create an experience, GPT needs to know:
- 6 template IDs (hardcoded in instructions)
- 6 step type payload schemas (hardcoded in instructions)
- Resolution enum values (hardcoded in instructions)
- Re-entry contract shape (hardcoded in instructions)
- Lifecycle transition rules (hardcoded in instructions)
- Multi-pass CRUD endpoints (hardcoded in instructions)

And it needs all of this in its system prompt before it even starts talking. Most of it will never be used in a given conversation.

### The Principle: Progressive Disclosure for AI

The same principle that makes UIs good — **show only what's needed when it's needed** — should apply to how GPT connects to the system.

Instead of:
```
GPT system prompt contains ALL schemas for ALL endpoints
  → GPT guesses which one to use
  → OpenAPI schema grows forever
```

The model should be:
```
GPT system prompt contains a FEW high-level actions + a discovery mechanism
  → GPT calls discover to learn HOW to do something specific
  → The system teaches GPT the schema at runtime
  → OpenAPI schema stays small
```

### The 5 Gateway Endpoints (GPT-Facing)

```
GET  /api/gpt/state         → Everything GPT needs on entry (already exists, gets richer)
POST /api/gpt/plan          → All planning operations (outlines, research dispatch, gap analysis)
POST /api/gpt/create        → All creation operations (experiences, ideas, steps — discriminated by type)
POST /api/gpt/update        → All mutation operations (step edits, reorder, status transitions, enrichment)
GET  /api/gpt/discover      → "How do I do X?" — returns schema + examples for any capability
```

### The Coach API (Frontend-Facing, Not GPT)

Tutor chat and checkpoint grading are **not GPT operations**. They happen inside the workspace — the user is working through a step and the KnowledgeCompanion (acting as an inline coach) handles contextual Q&A and grading. GPT never calls these endpoints.

```
POST /api/coach/chat         → Contextual tutor Q&A within an active step (calls tutorChatFlow)
POST /api/coach/grade        → Semantic grading of checkpoint answers (calls gradeCheckpointFlow)
POST /api/coach/mastery      → Evidence-based mastery assessment on completion (calls assessMasteryFlow)
```

This is a **frontend ↔ Genkit** surface, not a GPT gateway. The KnowledgeCompanion component calls these directly.

### How `discover` Works

Instead of encoding every payload schema in the instructions, the instructions say:

> "You have 6 endpoints. When you need to create something, use `POST /api/gpt/create`. If you're not sure of the exact payload shape, call `GET /api/gpt/discover?capability=create_experience` first — it will show you the schema and an example."

The discover endpoint returns contextual guidance:

```json
// GET /api/gpt/discover?capability=create_experience
{
  "capability": "create_experience",
  "endpoint": "POST /api/gpt/create",
  "description": "Create a persistent or ephemeral experience with steps",
  "schema": { "type": "...", "templateId": "...", "steps": "[...]" },
  "example": { "...full working example..." },
  "relatedCapabilities": ["create_outline", "add_step", "link_knowledge"]
}

// GET /api/gpt/discover?capability=step_payload&step_type=checkpoint
{
  "capability": "step_payload",
  "step_type": "checkpoint",
  "description": "Tests understanding of a linked knowledge unit",
  "schema": { "knowledge_unit_id": "string", "questions": "[...]", "..." },
  "when_to_use": "After a lesson step to verify comprehension"
}

// GET /api/gpt/discover?capability=templates
{
  "capability": "templates",
  "templates": [
    { "id": "b0000000-...-000001", "class": "questionnaire", "use_for": "Surveys, intake" },
    { "id": "b0000000-...-000002", "class": "lesson", "use_for": "Content delivery" }
  ]
}
```

### What This Solves

1. **Instructions shrink dramatically.** Remove all payload schemas, template IDs, and per-step format docs from the system prompt. Replace with: "Call `discover` to learn any schema."

2. **Schema stops growing.** Adding a new step type doesn't add a new endpoint or expand the OpenAPI. It adds a new `discover` response.

3. **GPT learns at runtime.** If GPT needs to create a checkpoint, it calls `discover?capability=step_payload&step_type=checkpoint` and gets the schema + example.

4. **Compound endpoints are stable.** `POST /api/gpt/create` never changes shape. What changes is what `type` values it accepts and what discover returns for each.

5. **Backward compatible.** The old fine-grained endpoints still work for the frontend. The gateway is a GPT-specific orchestration layer.

6. **Clean separation.** GPT operates the system (plan, create, update). The coach operates inside steps (tutor, grade). They never cross.

### How Each Gateway Works Internally

#### `POST /api/gpt/plan` — Discriminated by `action`
```json
{ "action": "create_outline",    "payload": { "topic": "...", "subtopics": "[...]" } }
{ "action": "dispatch_research", "payload": { "topic": "...", "outlineId": "..." } }
{ "action": "assess_gaps",       "payload": { "outlineId": "..." } }
```

#### `POST /api/gpt/create` — Discriminated by `type`
```json
{ "type": "experience",  "payload": { "templateId": "...", "steps": "[...]" } }
{ "type": "ephemeral",   "payload": { "title": "...", "resolution": "{...}" } }
{ "type": "idea",        "payload": { "title": "...", "rawPrompt": "..." } }
{ "type": "step",        "payload": { "experienceId": "...", "type": "lesson" } }
{ "type": "outline",     "payload": { "topic": "...", "subtopics": "[...]" } }
```

#### `POST /api/gpt/update` — Discriminated by `action`
```json
{ "action": "update_step",    "payload": { "experienceId": "...", "stepId": "..." } }
{ "action": "reorder_steps",  "payload": { "experienceId": "...", "stepIds": "[...]" } }
{ "action": "delete_step",    "payload": { "experienceId": "...", "stepId": "..." } }
{ "action": "transition",     "payload": { "experienceId": "...", "action": "activate" } }
{ "action": "link_knowledge", "payload": { "stepId": "...", "knowledgeUnitId": "..." } }
```

#### Coach API (frontend-facing, NOT in GPT's schema)
```json
// POST /api/coach/chat
{ "stepId": "...", "message": "...", "knowledgeUnitId": "..." }

// POST /api/coach/grade
{ "stepId": "...", "questionId": "...", "answer": "..." }

// POST /api/coach/mastery
{ "experienceId": "..." }
```

### What The GPT Instructions Become

After the gateway pattern, instructions go from 155 lines to ~50:

```markdown
You are Mira — a personal experience engine.

## Your Endpoints
- GET /api/gpt/state — Call first. Shows everything about the user.
- POST /api/gpt/plan — Create curriculum outlines, dispatch research, find gaps.
- POST /api/gpt/create — Create experiences, ideas, steps, and outlines.
- POST /api/gpt/update — Edit steps, reorder, transition status, link knowledge.
- GET /api/gpt/discover — Ask "how do I do X?" and get the exact schema + example.

## How To Use Discover
  GET /api/gpt/discover?capability=create_experience
  GET /api/gpt/discover?capability=step_payload&step_type=checkpoint
  GET /api/gpt/discover?capability=templates

## Rules
[behavioral rules only — no schemas, no template IDs, no payload formats]
```

Note: Tutor chat and checkpoint grading happen inside the workspace via the Coach API (`/api/coach/*`). GPT does not call these — the frontend's KnowledgeCompanion does. GPT's job is to **create** the learning structures; the coach helps the user **work through** them.

Adding checkpoint, field_study, or any new step type adds ZERO lines to the instructions. It adds a `discover` response.

---

## What Changes In Existing Systems

### New Entities

#### `curriculum_outlines` table
```sql
CREATE TABLE curriculum_outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  topic TEXT NOT NULL,
  domain TEXT,
  discovery_signals JSONB DEFAULT '{}',
  subtopics JSONB DEFAULT '[]',
  existing_unit_ids JSONB DEFAULT '[]',
  research_needed JSONB DEFAULT '[]',
  pedagogical_intent TEXT NOT NULL DEFAULT 'build_understanding',
  estimated_experience_count INTEGER,
  status TEXT NOT NULL DEFAULT 'planning',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `step_knowledge_links` table
```sql
CREATE TABLE step_knowledge_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES experience_steps(id),
  knowledge_unit_id UUID NOT NULL REFERENCES knowledge_units(id),
  link_type TEXT NOT NULL DEFAULT 'teaches',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### New fields on existing tables
- `experience_instances.curriculum_outline_id` — optional FK to `curriculum_outlines`
- `knowledge_units.curriculum_outline_id` — optional FK (links research to the outline)

### New Step Type: `checkpoint`
- Added to `CONTRACTED_STEP_TYPES`
- New `ModuleRole`: `'test'`
- New renderer: `CheckpointStep`

### New Interaction Event Types
```ts
'tutor_exchange'       // user ↔ Genkit conversation within a step
'checkpoint_attempt'   // user answered a checkpoint question
'checkpoint_graded'    // Genkit graded the answer
'mastery_assessed'     // assessMasteryFlow produced a verdict
```

### KnowledgeCompanion Evolution
1. **Read-only mode** (current): Shows linked knowledge unit thesis + "Read more →"
2. **Tutor mode** (new): When Genkit is available + step has knowledge link, adds a chat input at the bottom of the companion panel. Same component, richer behavior.

---

## The Future Learning Surface

The future learning surface still matters, but it is downstream, not upstream. It should not replace experiences. It should make them legible over time by showing:
- Current curriculum track
- Linked experiences
- Related knowledge units
- Mastery/progress shifts
- Recommended next deep dive
- Return points

That is the "non-classroom classroom": structured enough to trust, flexible enough to stay action-first. This only becomes meaningful once the planning layer and the experience deepening loop are working.

---

## Implementation Priority

| Priority | What | Pillar |
|----------|------|--------|
| **P0** | `GET /api/gpt/discover` endpoint | 3 — Gateway |
| **P0** | `POST /api/gpt/plan` + curriculum outline service | 1 + 3 |
| **P0** | `POST /api/gpt/create` (consolidate existing creation endpoints) | 3 — Gateway |
| **P0** | `curriculum_outlines` + `step_knowledge_links` tables (migration) | 1 — Planning |
| **P0** | GPT instructions rewrite (~50 lines, behavioral only) | 3 — Gateway |
| **P1** | `POST /api/gpt/update` (consolidate mutation endpoints) | 3 — Gateway |
| **P1** | `POST /api/gpt/teach` (tutor chat + checkpoint grading) | 2 + 3 |
| **P1** | `checkpoint` step type + renderer | 2 — Knowledge |
| **P1** | TutorChat evolution of KnowledgeCompanion | 2 — Knowledge |
| **P1** | Curriculum-linked visual treatment (amber workbook feel) | 1 — Planning |
| **P2** | OpenAPI schema rewrite (1,309 → ~300 lines) | 3 — Gateway |
| **P2** | `assessMasteryFlow` + `gradeCheckpointFlow` (Genkit) | 2 — Knowledge |
| **P2** | Multi-pass deepening logic in GPT instructions | 1 — Planning |
| **P3** | Future step types (field_study, practice_ladder, etc.) | — |

---

## Open Questions

1. **Should curriculum outlines be visible to the user?** Lean yes — "Mira planned a 3-module curriculum for business fundamentals" builds trust. Rendering can be minimal (a progress track, not a full course page).

2. **Should checkpoints block step progression?** If `on_fail: 'retry'`, can the user skip ahead anyway? Lean yes with a warning — no frustration loops.

3. **Should TutorChat conversations persist across sessions?** Lean yes — store in `artifacts` table as `artifact_type: 'tutor_transcript'`.

4. **When should GPT skip the planning phase?** Ephemeral micro-nudges, single-step challenges, and "try this one thing" experiences don't need outlines. Planning fires when GPT detects a multi-step learning domain, not for every interaction.

5. **How does discover handle versioning?** Include a `version` field in discover responses. GPT always gets the latest schema. Old payload shapes accepted with graceful migration.

---

## Design Commitments

1. **Experiences remain the main vehicle.** Do not replace them with a separate classroom product. Make them curriculum-aware.

2. **Planning must happen before serious experience generation.** Every multi-step learning domain needs a curriculum outline first.

3. **MiraK research must follow planning and arrive contextually.** Knowledge is support material, not the first artifact.

4. **Multi-pass and re-entry become curriculum refinement, not just edits or reminders.** The system should resize based on actual evidence from use.

5. **GPT should connect through a smart gateway, not a growing pile of hardcoded schemas.** Progressive disclosure becomes an architecture rule, not a convenience. **Adding a feature should not grow the schema or the GPT prompt.** New capabilities extend the gateway vocabulary and discover responses, not prompt debt.

---

## Strong Conclusion

Mira already has the right bones. What it lacks is a scoping artifact before teaching, a timing system for knowledge, and a connection layer that lets GPT use the system without drowning in documentation.

The path forward has three equally important parts:
1. **Make experiences curriculum-aware** — planning before generation, right-sizing through outlines
2. **Make knowledge arrive in context** — four modes of delivery, not a front door
3. **Make the connection smart** — compound gateway endpoints with progressive discovery, not endpoint explosion

That is how Mira can deepen what it already built, scale without schema debt, and grow into a real adaptive learning system without throwing away its current bones or suffocating under its own API surface.

```

### gitr.sh

```bash
#!/usr/bin/env bash

set -euo pipefail

# Usage: ./gitr.sh "commit message here"
# Stages, commits, and pushes current branch.
# It will NOT auto-rebase on push failure.

msg=${1:-"chore: update"}

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [[ -z "${repo_root}" ]]; then
    echo "ERROR: Not a git repository."
    exit 1
fi
cd "${repo_root}"

if [[ -d .git/rebase-merge || -d .git/rebase-apply || -f .git/MERGE_HEAD ]]; then
    echo "ERROR: Rebase/merge in progress. Resolve it first."
    exit 1
fi

branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "${branch}" == "HEAD" ]]; then
    echo "ERROR: Detached HEAD. Checkout a branch first."
    exit 1
fi

remote="origin"

echo "Repo: ${repo_root}"
echo "Branch: ${branch}"
echo "Staging changes..."

if ! git add -A; then
    echo "WARN: git add -A failed. Retrying with safer staging."
    git add -u
    while IFS= read -r path; do
        base=$(basename "$path")
        lower=$(printf '%s' "$base" | tr '[:upper:]' '[:lower:]')
        case "$lower" in
            nul|con|prn|aux|com[1-9]|lpt[1-9])
                echo "Skipping reserved path on Windows: $path"
                continue
                ;;
        esac
        git add -- "$path" || echo "Skipping unstageable path: $path"
    done < <(git ls-files --others --exclude-standard)
fi

if git diff --cached --quiet; then
    echo "No staged changes to commit."
else
    echo "Committing: ${msg}"
    git commit -m "${msg}"
fi

if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
    echo "Pushing to ${remote}/${branch}..."
    if git push "${remote}" "${branch}"; then
        echo "Push succeeded."
        exit 0
    fi
else
    echo "Pushing and setting upstream ${remote}/${branch}..."
    if git push -u "${remote}" "${branch}"; then
        echo "Push succeeded."
        exit 0
    fi
fi

echo "Push failed (likely non-fast-forward)."
echo "Run this manually:"
echo "  git fetch ${remote}"
echo "  git log --oneline --graph --decorate --max-count=20 --all"
echo "  git push"
exit 1

```

### gitrdif.sh

```bash
#!/bin/bash

# gitrdif.sh - Generate a diff between local and remote branch
# Output: gitrdiff.md in the project root

# Get current branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Fetch latest from remote without merging
echo "Fetching latest from origin/$BRANCH..."
git fetch origin "$BRANCH" 2>/dev/null

# Check if remote branch exists
if ! git rev-parse --verify "origin/$BRANCH" > /dev/null 2>&1; then
    echo "Remote branch origin/$BRANCH not found. Using origin/main..."
    REMOTE_BRANCH="origin/main"
else
    REMOTE_BRANCH="origin/$BRANCH"
fi

# Output file
OUTPUT="gitrdiff.md"

# Generate the diff
echo "Generating diff: local $BRANCH vs $REMOTE_BRANCH..."

{
    echo "# Git Diff Report"
    echo ""
    echo "**Generated**: $(date)"
    echo ""
    echo "**Local Branch**: $BRANCH"
    echo ""
    echo "**Comparing Against**: $REMOTE_BRANCH"
    echo ""
    echo "---"
    echo ""
    
    # NEW: Show uncommitted changes first (working directory)
    echo "## Uncommitted Changes (working directory)"
    echo ""
    echo "### Modified/Staged Files"
    echo ""
    echo '```'
    git status --short 2>/dev/null || echo "(clean)"
    echo '```'
    echo ""
    
    # Check if there are any uncommitted changes
    if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
        echo "### Uncommitted Diff"
        echo ""
        echo '```diff'
        git diff -- ':!gitrdiff.md' 2>/dev/null
        git diff --cached -- ':!gitrdiff.md' 2>/dev/null
        echo '```'
        echo ""
    fi
    
    # NEW: Show contents of untracked files (new files not yet staged)
    UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null)
    if [ -n "$UNTRACKED" ]; then
        echo "### New Untracked Files"
        echo ""
        for file in $UNTRACKED; do
            # Skip binary files and very large files
            if [ -f "$file" ]; then
                # Checking if it's a text file
                if command -v file >/dev/null 2>&1; then
                    if ! file "$file" | grep -q text; then
                        continue
                    fi
                fi
                
                LINES=$(wc -l < "$file" 2>/dev/null || echo "0")
                if [ "$LINES" -lt 500 ]; then
                    echo "#### \`$file\`"
                    echo ""
                    echo '```'
                    cat "$file" 2>/dev/null
                    echo '```'
                    echo ""
                else
                    echo "#### \`$file\` ($LINES lines - truncated)"
                    echo ""
                    echo '```'
                    head -100 "$file" 2>/dev/null
                    echo "... ($LINES total lines)"
                    echo '```'
                    echo ""
                fi
            fi
        done
    fi
    
    echo "---"
    echo ""
    
    # NEW: Show changes from the last pull/merge if applicable
    if git rev-parse ORIG_HEAD >/dev/null 2>&1; then
        VAL_HEAD=$(git rev-parse HEAD)
        VAL_ORIG=$(git rev-parse ORIG_HEAD)
        if [ "$VAL_HEAD" != "$VAL_ORIG" ]; then
            echo "## Changes from Last Pull/Merge (ORIG_HEAD vs HEAD)"
            echo ""
            echo "These are the changes that recently came into your branch."
            echo ""
            echo '```diff'
            git diff ORIG_HEAD HEAD --stat 2>/dev/null
            echo '```'
            echo ""
            echo '```diff'
            # Limit full diff to avoid massive files
            git diff ORIG_HEAD HEAD 2>/dev/null | head -n 1000
            echo "... (truncated to 1000 lines)"
            echo '```'
            echo ""
            echo "---"
            echo ""
        fi
    fi

    # Show commits that are different
    echo "## Commits Ahead (local changes not on remote)"
    echo ""
    echo '```'
    git log --oneline "$REMOTE_BRANCH..HEAD" 2>/dev/null || echo "(none)"
    echo '```'
    echo ""
    
    echo "## Commits Behind (remote changes not pulled)"
    echo ""
    echo '```'
    git log --oneline "HEAD..$REMOTE_BRANCH" 2>/dev/null || echo "(none)"
    echo '```'
    echo ""
    
    echo "---"
    echo ""
    
    CHANGES_BEHIND=$(git rev-list HEAD..$REMOTE_BRANCH --count 2>/dev/null || echo "0")
    CHANGES_AHEAD=$(git rev-list $REMOTE_BRANCH..HEAD --count 2>/dev/null || echo "0")
    
    if [ "$CHANGES_BEHIND" -eq 0 ] && [ "$CHANGES_AHEAD" -eq 0 ]; then
        echo "## Status: Up to Date"
        echo ""
        echo "Your local branch is even with **$REMOTE_BRANCH**."
        echo "No unpushed commits."
        echo ""
    fi
    echo "## File Changes (YOUR UNPUSHED CHANGES)"
    echo ""
    echo '```'
    git diff --stat "$REMOTE_BRANCH" HEAD 2>/dev/null || echo "(no changes)"
    echo '```'
    echo ""
    
    echo "---"
    echo ""
    echo "## Full Diff of Your Unpushed Changes"
    echo ""
    echo "Green (+) = lines you ADDED locally"
    echo "Red (-) = lines you REMOVED locally"
    echo ""
    echo '```diff'
    git diff "$REMOTE_BRANCH" HEAD -- ':!gitrdiff.md' 2>/dev/null || echo "(no diff)"
    echo '```'
    
} > "$OUTPUT"

echo "Done! Created $OUTPUT"
echo ""
echo "Summary:"
echo "  Uncommitted files: $(git status --short 2>/dev/null | wc -l | tr -d ' ')"
echo "  YOUR unpushed commits: $(git log --oneline "$REMOTE_BRANCH..HEAD" 2>/dev/null | wc -l | tr -d ' ')"
echo "  Remote commits to pull: $(git log --oneline "HEAD..$REMOTE_BRANCH" 2>/dev/null | wc -l | tr -d ' ')"

```

### gitrdiff.md

```markdown
# Git Diff Report

**Generated**: Sun, Mar 29, 2026  6:59:28 PM

**Local Branch**: main

**Comparing Against**: origin/main

---

## Uncommitted Changes (working directory)

### Modified/Staged Files

```
```

---

## Commits Ahead (local changes not on remote)

```
131ced6 Sprint 15 Complete
8d25e3d checkout: temporary commit for worktree checkout
```

## Commits Behind (remote changes not pulled)

```
```

---

## File Changes (YOUR UNPUSHED CHANGES)

```
 agents.md                                      |   2 +
 app/api/experiences/inject/route.ts            |   9 +-
 app/api/gpt/state/route.ts                     |   7 +-
 app/library/LibraryClient.tsx                  |  90 ++++-
 app/page.tsx                                   |  78 +++++
 app/profile/ProfileClient.tsx                  | 106 ++++--
 app/profile/page.tsx                           |  35 +-
 app/timeline/TimelineClient.tsx                | 101 +++++-
 app/timeline/page.tsx                          |   4 +-
 app/workspace/[instanceId]/WorkspaceClient.tsx |  47 ++-
 app/workspace/[instanceId]/page.tsx            |  12 +-
 board.md                                       | 450 +++++++++++++------------
 components/common/ReentryPromptCard.tsx        |  64 ++++
 components/experience/CompletionScreen.tsx     |  94 +++++-
 components/experience/EphemeralToast.tsx       | 133 ++++++++
 components/profile/DirectionSummary.tsx        | 169 ++++++----
 components/profile/FacetCard.tsx               |  48 ++-
 components/profile/SkillTrajectory.tsx         |  76 +++++
 components/timeline/TimelineEventCard.tsx      |  52 ++-
 components/timeline/TimelineFilterBar.tsx      |   9 +-
 docs/contracts/v1-experience-contract.md       |   4 +-
 lib/experience/reentry-engine.ts               | 102 ++++--
 lib/gateway/discover-registry.ts               |  10 +-
 lib/gateway/gateway-router.ts                  |   7 +-
 lib/services/experience-service.ts             |  18 +-
 lib/services/facet-service.ts                  |  41 ++-
 lib/services/graph-service.ts                  |  65 +++-
 lib/services/home-summary-service.ts           |   8 +
 lib/services/synthesis-service.ts              |  17 +-
 lib/services/timeline-service.ts               |  81 +++--
 lib/storage.ts                                 |  16 +
 lib/validators/experience-validator.ts         |   4 +
 roadmap.md                                     |  67 ++--
 test_synthesis.js                              |  39 +++
 types/experience.ts                            |   1 +
 types/profile.ts                               |  10 +-
 types/synthesis.ts                             |   1 +
 types/timeline.ts                              |   4 +-
 38 files changed, 1595 insertions(+), 486 deletions(-)
```

---

## Full Diff of Your Unpushed Changes

Green (+) = lines you ADDED locally
Red (-) = lines you REMOVED locally

```diff
diff --git a/agents.md b/agents.md
index 044c175..78fb7d3 100644
--- a/agents.md
+++ b/agents.md
@@ -649,3 +649,5 @@ All API response fields for the `Idea` entity use **snake_case** (`raw_prompt`,
 - **2026-03-29**: Roadmap rebase — Sprints 1–10 marked ✅ Complete, Sprint 11 ✅ Code Complete. Roadmap rebased off board truth. Sprint numbers shifted: old 11 (Goal OS) → 13, old 12 (Coder Pipeline) → 14, old 13 → 15, old 14 → 16, old 15 → 17, old 16 → 18. Sprint 12 is now Learning Loop Productization (surface existing intelligence). Added SOP-27 (Genkit dynamic imports), SOP-28 (experience sizing). Updated architecture diagram to show 7 Genkit flows, 6 GPT endpoints, enrichment mode. Removed stale "Target Architecture" section and "What is still stubbed" section — replaced with accurate "What is NOT visible to the user" gap analysis.
 - **2026-03-29**: Sprint 13 completed (Goal OS + Skill Map). Gate 0 + 7 lanes. Migration 008 (goals + skill_domains tables). Goal service, skill domain service, skill mastery engine, GPT gateway goal capability, Skills page + SkillTreeGrid, batch grade + knowledge endpoints, home-summary-service (N+1 elimination). Added SOP-32 (discover-registry-validator sync), SOP-33 (mastery recompute action naming). Sprint 13 debt carried forward: discover-registry lies to GPT for 4/6 step types, stale OpenAPI, mastery recompute action mismatch in ExperienceRenderer.
 - **2026-03-29**: Sprint 14 boardinit (Surface the Intelligence). 7 lanes: Schema Truth Pass, Skill Tree Upgrade, Intelligent Focus Today, Mastery Visibility + Checkpoint Feedback, Proactive Coach Surfacing, Completion Retrospective, Integration + Browser QA. Incorporates UX feedback items #1 (skill cards as micro-roadmaps), #2 (intelligent Focus Today), #5 (mastery changes inline), #6 (proactive coach with context), #7 (completion retrospective). Deferred: #9 (fog-of-war), #10 (MiraK depth control), #12 (user agency), #8 (GPT session history), #11 (nav restructure), #14 (MiraK gap analyst).
+- **2026-03-29**: Sprint 14 completed (Surface the Intelligence). All 7 lanes done. Fixed discover-registry/validator alignment for all 7 step types (SOP-32). Fixed mastery N+1 pattern in `computeSkillMastery()` (SOP-30). Removed dead `outlineIds` from goal creation + migration 008. Updated OpenAPI with goalId on plan endpoint. Added `plan_builder` to discover registry. Skill Tree cards upgraded to micro-roadmaps with evidence-needed and next-experience links. Focus Today uses priority heuristic (scheduled > mastery proximity > failed checkpoints > recency). Checkpoint shows mastery impact callout + toast. Coach surfaces with question-level context after failed checkpoints. Completion screen shows "What Moved" mastery transitions and "What You Did" activity summary. No new SOPs — this was a pure wiring/polish sprint.
+- **2026-03-29**: Sprint 15 boardinit (Chained Experiences + Spontaneity). 7 lanes: Experience Chaining + Graph UI, Ephemeral Injection System, Re-Entry Engine + Follow-Ups, Friction Synthesis + Weekly Loops, Timeline Page, Profile Page Upgrade, Integration + Browser QA. Wires existing backend infrastructure (graph service, progression rules, re-entry engine, timeline service, facet service from Sprints 5-7) into the lived UX. Two new components (EphemeralToast, ReentryPromptCard). Two page upgrades (Timeline, Profile). Deferred from roadmap: fog-of-war, MiraK depth control.
diff --git a/app/api/experiences/inject/route.ts b/app/api/experiences/inject/route.ts
index dfe9605..f5a7e35 100644
--- a/app/api/experiences/inject/route.ts
+++ b/app/api/experiences/inject/route.ts
@@ -55,7 +55,14 @@ export async function POST(request: Request) {
       })
     }
 
-    return NextResponse.json(instance, { status: 201 })
+    return NextResponse.json({
+      ...instance,
+      notification: {
+        show: true,
+        toast: true,
+        urgency: normalized.urgency
+      }
+    }, { status: 201 })
   } catch (error: any) {
     console.error('Failed to inject experience:', error)
     return NextResponse.json({ error: error.message || 'Failed to inject experience' }, { status: 500 })
diff --git a/app/api/gpt/state/route.ts b/app/api/gpt/state/route.ts
index ce04d8a..5c895ca 100644
--- a/app/api/gpt/state/route.ts
+++ b/app/api/gpt/state/route.ts
@@ -4,6 +4,7 @@ import { getKnowledgeSummaryForGPT } from '@/lib/services/knowledge-service'
 import { getCurriculumSummaryForGPT } from '@/lib/services/curriculum-outline-service'
 import { getActiveGoal } from '@/lib/services/goal-service'
 import { getSkillDomainsForGoal } from '@/lib/services/skill-domain-service'
+import { getGraphSummaryForGPT } from '@/lib/services/graph-service'
 import { DEFAULT_USER_ID } from '@/lib/constants'
 
 export async function GET(request: Request) {
@@ -11,11 +12,12 @@ export async function GET(request: Request) {
   const userId = searchParams.get('userId') || DEFAULT_USER_ID
 
   try {
-    const [packet, knowledgeSummary, curriculum, activeGoal] = await Promise.all([
+    const [packet, knowledgeSummary, curriculum, activeGoal, graphSummary] = await Promise.all([
       buildGPTStatePacket(userId),
       getKnowledgeSummaryForGPT(userId),
       getCurriculumSummaryForGPT(userId),
       getActiveGoal(userId),
+      getGraphSummaryForGPT(userId)
     ])
 
     let skillDomains: any[] = []
@@ -36,7 +38,8 @@ export async function GET(request: Request) {
       skill_domains: skillDomains.map(d => ({
         name: d.name,
         mastery_level: d.masteryLevel
-      }))
+      })),
+      graph: graphSummary
     })
   } catch (error) {
     console.error('Failed to build GPT state packet:', error)
diff --git a/app/library/LibraryClient.tsx b/app/library/LibraryClient.tsx
index 684bc85..9186ba9 100644
--- a/app/library/LibraryClient.tsx
+++ b/app/library/LibraryClient.tsx
@@ -28,6 +28,14 @@ export default function LibraryClient({
   const router = useRouter();
   const [loadingId, setLoadingId] = useState<string | null>(null);
 
+  // Build a map of experience IDs to titles for chain links
+  const experienceMap = new Map<string, string>([
+    ...active.map(e => [e.id, e.title] as [string, string]),
+    ...completed.map(e => [e.id, e.title] as [string, string]),
+    ...moments.map(e => [e.id, e.title] as [string, string]),
+    ...proposed.map(e => [e.id, e.title] as [string, string]),
+  ]);
+
   const handleAcceptAndStart = async (id: string) => {
     setLoadingId(id);
     try {
@@ -121,16 +129,44 @@ export default function LibraryClient({
         empty={COPY.library.emptyActive} 
         items={active}
       >
-        {(instance) => (
-          <ExperienceCard key={instance.id} instance={instance}>
-            <Link 
-              href={ROUTES.workspace(instance.id)}
-              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500/10 text-indigo-400 rounded-xl font-bold hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
-            >
-              {COPY.library.enter}
-            </Link>
-          </ExperienceCard>
-        )}
+        {(instance) => {
+          const nextId = instance.next_suggested_ids?.[0]; // Show the first suggestion for now
+          const nextTitle = nextId ? experienceMap.get(nextId) : null;
+          const prevId = instance.previous_experience_id;
+          const prevTitle = prevId ? experienceMap.get(prevId) : null;
+
+          return (
+            <ExperienceCard key={instance.id} instance={instance}>
+              <Link 
+                href={ROUTES.workspace(instance.id)}
+                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500/10 text-indigo-400 rounded-xl font-bold hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
+              >
+                {COPY.library.enter}
+              </Link>
+
+              {(nextTitle || prevTitle) && (
+                <div className="mt-4 pt-4 border-t border-[#1e1e2e] flex flex-wrap gap-2">
+                  {prevTitle && (
+                    <Link 
+                      href={ROUTES.workspace(prevId!)}
+                      className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold hover:bg-slate-800 transition-all border border-indigo-500/20 whitespace-nowrap"
+                    >
+                      ← Previous: {prevTitle}
+                    </Link>
+                  )}
+                  {nextTitle && (
+                    <Link 
+                      href={ROUTES.workspace(nextId!)}
+                      className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold hover:bg-slate-800 transition-all border border-indigo-500/20 whitespace-nowrap"
+                    >
+                      Continue: {nextTitle} →
+                    </Link>
+                  )}
+                </div>
+              )}
+            </ExperienceCard>
+          );
+        }}
       </Section>
 
       {/* Completed Experiences */}
@@ -139,9 +175,37 @@ export default function LibraryClient({
         empty={COPY.library.emptyCompleted} 
         items={completed}
       >
-        {(instance) => (
-          <ExperienceCard key={instance.id} instance={instance} />
-        )}
+        {(instance) => {
+          const nextId = instance.next_suggested_ids?.[0];
+          const nextTitle = nextId ? experienceMap.get(nextId) : null;
+          const prevId = instance.previous_experience_id;
+          const prevTitle = prevId ? experienceMap.get(prevId) : null;
+
+          return (
+            <ExperienceCard key={instance.id} instance={instance}>
+              {(nextTitle || prevTitle) && (
+                <div className="flex flex-wrap gap-2">
+                  {prevTitle && (
+                    <Link 
+                      href={ROUTES.workspace(prevId!)}
+                      className="px-2 py-1 rounded bg-[#0d0d14] text-[#4a4a6a] text-[10px] font-bold hover:text-indigo-400 transition-all border border-[#1e1e2e] whitespace-nowrap"
+                    >
+                      ← Previous: {prevTitle}
+                    </Link>
+                  )}
+                  {nextTitle && (
+                    <Link 
+                      href={ROUTES.workspace(nextId!)}
+                      className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold hover:bg-slate-800 transition-all border border-indigo-500/20 whitespace-nowrap"
+                    >
+                      Continue: {nextTitle} →
+                    </Link>
+                  )}
+                </div>
+              )}
+            </ExperienceCard>
+          );
+        }}
       </Section>
 
       {/* Moments (Ephemeral) */}
diff --git a/app/page.tsx b/app/page.tsx
index 51e3157..1173d2c 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -13,6 +13,9 @@ import { ResearchStatusBadge } from '@/components/common/ResearchStatusBadge'
 import TrackSection from '@/components/experience/TrackSection'
 import type { Project } from '@/types/project'
 import type { InboxEvent } from '@/types/inbox'
+import { EphemeralToast } from '@/components/experience/EphemeralToast'
+import { evaluateReentryContracts } from '@/lib/experience/reentry-engine'
+import { ReentryPromptCard } from '@/components/common/ReentryPromptCard'
 
 function HealthDot({ health }: { health: Project['health'] }) {
   const colorMap = {
@@ -56,8 +59,11 @@ export default async function HomePage() {
     arenaProjects,
     recentEvents,
     capturedIdeas,
+    pendingEphemerals,
   } = summary
 
+  const reentryPrompts = await evaluateReentryContracts(userId)
+
   // Calculate session days for welcome back context
   let lastSessionDays = 0
   if (focusExperience.lastActivityAt) {
@@ -74,6 +80,20 @@ export default async function HomePage() {
 
   return (
     <AppShell>
+      {pendingEphemerals.length > 0 && (() => {
+        const eph = pendingEphemerals[0];
+        const intensityToUrgency = { low: 'low' as const, moderate: 'medium' as const, high: 'high' as const };
+        const urgency = intensityToUrgency[eph.resolution?.intensity as keyof typeof intensityToUrgency] || 'low';
+        return (
+          <EphemeralToast 
+            title={eph.title}
+            goal={eph.goal}
+            experienceClass={eph.resolution.mode as any}
+            instanceId={eph.id}
+            urgency={urgency}
+          />
+        );
+      })()}
       <div className="max-w-2xl mx-auto space-y-10 pb-20">
         {/* Page title */}
         <div className="flex flex-col gap-1 mt-6">
@@ -138,6 +158,64 @@ export default async function HomePage() {
           />
         </section>
 
+        {/* ── Section: Spontaneous ── */}
+        {pendingEphemerals.length > 0 && (
+          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
+            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
+              Just Dropped
+            </h2>
+            <div className="grid grid-cols-1 gap-3">
+              {pendingEphemerals.map((exp) => (
+                <Link
+                  key={exp.id}
+                  href={ROUTES.workspace(exp.id)}
+                  className="group relative flex items-center justify-between gap-4 p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl hover:bg-indigo-500/10 transition-all overflow-hidden"
+                >
+                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50" />
+                  <div className="flex items-center gap-4 min-w-0">
+                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-indigo-500/10 rounded-xl text-xl">
+                      ⚡
+                    </div>
+                    <div className="min-w-0">
+                      <h3 className="text-sm font-bold text-[#f1f5f9] truncate group-hover:text-indigo-300 transition-colors">
+                        {exp.title}
+                      </h3>
+                      <p className="text-xs text-[#94a3b8] truncate">
+                        {exp.goal}
+                      </p>
+                    </div>
+                  </div>
+                  <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-wider group-hover:translate-x-1 transition-transform whitespace-nowrap">
+                    Jump In →
+                  </div>
+                </Link>
+              ))}
+            </div>
+          </section>
+        )}
+
+        {/* ── Section: Re-entry ── */}
+        {reentryPrompts.length > 0 && (
+          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
+            <h2 className="text-xs font-bold text-amber-500 uppercase tracking-widest">
+              Pick Up Where You Left Off
+            </h2>
+            <div className="grid grid-cols-1 gap-4">
+              {reentryPrompts.slice(0, 3).map((prompt) => (
+                <ReentryPromptCard key={prompt.instanceId} prompt={prompt} />
+              ))}
+              {reentryPrompts.length > 3 && (
+                <Link 
+                  href={`${ROUTES.library}?filter=reentry`}
+                  className="text-[10px] font-bold text-[#4a4a6a] hover:text-[#94a3b8] uppercase tracking-widest text-center py-2 border border-dashed border-[#1e1e2e] rounded-xl transition-colors"
+                >
+                  View {reentryPrompts.length - 3} more re-entry points →
+                </Link>
+              )}
+            </div>
+          </section>
+        )}
+
         {/* ── Section: Your Path ── */}
         <section>
           <div className="flex items-center justify-between mb-4">
diff --git a/app/profile/ProfileClient.tsx b/app/profile/ProfileClient.tsx
index ab2302f..1f6a609 100644
--- a/app/profile/ProfileClient.tsx
+++ b/app/profile/ProfileClient.tsx
@@ -31,34 +31,92 @@ export function ProfileClient({ profile }: ProfileClientProps) {
   if (profile.facets.length === 0) return null
 
   return (
-    <div className="space-y-6">
-      <div className="flex flex-wrap items-center gap-2">
-        {FILTERS.map(filter => (
-          <button
-            key={filter.value}
-            onClick={() => setActiveFilter(filter.value)}
-            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
-              activeFilter === filter.value
-                ? 'bg-white text-slate-900 shadow-lg'
-                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
-            }`}
-          >
-            {filter.label}
-          </button>
-        ))}
+    <div className="space-y-8">
+      {/* Activity Section */}
+      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
+        <ActivityCard 
+          label="Total Journeys" 
+          value={profile.experienceCount.total} 
+          subValue={`${profile.experienceCount.active} active`}
+        />
+        <ActivityCard 
+          label="Completion Rate" 
+          value={`${profile.experienceCount.completionRate.toFixed(0)}%`} 
+          subValue={`${profile.experienceCount.completed} completed`}
+          color="text-emerald-400"
+        />
+        <ActivityCard 
+          label="Top Focus" 
+          value={profile.experienceCount.mostActiveClass || 'None'} 
+          subValue="Most active class"
+          color="text-indigo-400"
+          isUppercase
+        />
+        <ActivityCard 
+          label="Avg Friction" 
+          value={profile.experienceCount.averageFriction.toFixed(1)} 
+          subValue="Scale 1-3"
+          color={profile.experienceCount.averageFriction > 2 ? 'text-amber-400' : 'text-slate-400'}
+        />
       </div>
 
-      {filteredFacets.length > 0 ? (
-        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
-          {filteredFacets.map(facet => (
-            <FacetCard key={facet.id} facet={facet} />
+      <div className="space-y-6">
+        <div className="flex flex-wrap items-center gap-2">
+          {FILTERS.map(filter => (
+            <button
+              key={filter.value}
+              onClick={() => setActiveFilter(filter.value)}
+              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
+                activeFilter === filter.value
+                  ? 'bg-white text-slate-900 shadow-lg'
+                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
+              }`}
+            >
+              {filter.label}
+            </button>
           ))}
         </div>
-      ) : (
-        <div className="py-12 text-center text-slate-500 italic">
-          No facets found for this category.
-        </div>
-      )}
+
+        {filteredFacets.length > 0 ? (
+          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
+            {filteredFacets.map(facet => (
+              <FacetCard key={facet.id} facet={facet} />
+            ))}
+          </div>
+        ) : (
+          <div className="py-12 text-center text-slate-500 italic">
+            No facets found for this category.
+          </div>
+        )}
+      </div>
+    </div>
+  )
+}
+
+function ActivityCard({ 
+  label, 
+  value, 
+  subValue, 
+  color = 'text-white',
+  isUppercase = false 
+}: { 
+  label: string; 
+  value: string | number; 
+  subValue: string; 
+  color?: string;
+  isUppercase?: boolean;
+}) {
+  return (
+    <div className="p-4 rounded-xl border border-white/5 bg-slate-900/40 flex flex-col gap-1">
+      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
+        {label}
+      </span>
+      <span className={`text-xl font-bold truncate ${color} ${isUppercase ? 'uppercase' : ''}`}>
+        {value}
+      </span>
+      <span className="text-[10px] text-slate-400 font-medium">
+        {subValue}
+      </span>
     </div>
   )
 }
diff --git a/app/profile/page.tsx b/app/profile/page.tsx
index bd0a103..192e23d 100644
--- a/app/profile/page.tsx
+++ b/app/profile/page.tsx
@@ -1,15 +1,27 @@
-// app/profile/page.tsx
 import { buildUserProfile } from '@/lib/services/facet-service'
+import { getGoalsForUser } from '@/lib/services/goal-service'
+import { getSkillDomainsForUser } from '@/lib/services/skill-domain-service'
 import { DEFAULT_USER_ID } from '@/lib/constants'
 import { AppShell } from '@/components/shell/app-shell'
 import { DirectionSummary } from '@/components/profile/DirectionSummary'
+import { SkillTrajectory } from '@/components/profile/SkillTrajectory'
 import { ProfileClient } from './ProfileClient'
 import { COPY } from '@/lib/studio-copy'
 
 export const dynamic = 'force-dynamic'
 
 export default async function ProfilePage() {
-  const profile = await buildUserProfile(DEFAULT_USER_ID)
+  const [profile, goals, skillDomains] = await Promise.all([
+    buildUserProfile(DEFAULT_USER_ID),
+    getGoalsForUser(DEFAULT_USER_ID),
+    getSkillDomainsForUser(DEFAULT_USER_ID)
+  ])
+
+  // Get active goal for trajectory
+  const activeGoal = goals.find(g => g.status === 'active') || goals[0]
+  const goalDomains = activeGoal 
+    ? skillDomains.filter(d => d.goalId === activeGoal.id)
+    : []
 
   return (
     <AppShell>
@@ -26,11 +38,26 @@ export default async function ProfilePage() {
 
         {/* Direction Summary */}
         <section>
-          <DirectionSummary profile={profile} />
+          <DirectionSummary 
+            profile={profile} 
+            activeGoal={activeGoal} 
+            skillDomains={skillDomains}
+          />
         </section>
 
+        {/* Skill Trajectory */}
+        {activeGoal && (
+          <section className="pt-8 border-t border-slate-800">
+            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
+              <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
+              Active Trajectory: {activeGoal.title}
+            </h2>
+            <SkillTrajectory domains={goalDomains} />
+          </section>
+        )}
+
         {/* Facet Engine */}
-        <section className="pt-8 border-t border-slate-800">
+        <section className="pt-12 border-t border-slate-800">
           <ProfileClient profile={profile} />
         </section>
       </div>
diff --git a/app/timeline/TimelineClient.tsx b/app/timeline/TimelineClient.tsx
index 788f491..dcc1fb3 100644
--- a/app/timeline/TimelineClient.tsx
+++ b/app/timeline/TimelineClient.tsx
@@ -1,23 +1,65 @@
 'use client'
 
-import { useState } from 'react'
+import { useState, useMemo } from 'react'
 import { TimelineEntry, TimelineStats, TimelineCategory } from '@/types/timeline'
 import { TimelineEventCard } from '@/components/timeline/TimelineEventCard'
 import { TimelineFilterBar } from '@/components/timeline/TimelineFilterBar'
 import { COPY } from '@/lib/studio-copy'
-import { EmptyState } from '@/components/common/empty-state'
 
 interface TimelineClientProps {
   initialEntries: TimelineEntry[]
   stats: TimelineStats
 }
 
+type GroupedEntries = {
+  label: string;
+  entries: TimelineEntry[];
+}[]
+
 export function TimelineClient({ initialEntries, stats }: TimelineClientProps) {
   const [filter, setFilter] = useState<'all' | TimelineCategory>('all')
 
-  const filteredEntries = initialEntries.filter(entry => 
-    filter === 'all' || entry.category === filter
-  )
+  const filteredEntries = useMemo(() => {
+    return initialEntries.filter(entry => 
+      filter === 'all' || entry.category === filter
+    )
+  }, [initialEntries, filter])
+
+  const groupedEntries = useMemo(() => {
+    const groups: Record<string, TimelineEntry[]> = {
+      'Today': [],
+      'Yesterday': [],
+      'This Week': [],
+      'Earlier': []
+    }
+
+    const now = new Date()
+    now.setHours(0, 0, 0, 0)
+    
+    const today = now.getTime()
+    const yesterday = today - (24 * 60 * 60 * 1000)
+    const thisWeek = today - (7 * 24 * 60 * 60 * 1000)
+
+    filteredEntries.forEach(entry => {
+      const entryDate = new Date(entry.timestamp)
+      entryDate.setHours(0, 0, 0, 0)
+      const entryTime = entryDate.getTime()
+
+      if (entryTime === today) {
+        groups['Today'].push(entry)
+      } else if (entryTime === yesterday) {
+        groups['Yesterday'].push(entry)
+      } else if (entryTime > thisWeek) {
+        groups['This Week'].push(entry)
+      } else {
+        groups['Earlier'].push(entry)
+      }
+    })
+
+    return Object.entries(groups)
+      .filter(([_, entries]) => entries.length > 0)
+      .map(([label, entries]) => ({ label, entries }))
+  }, [filteredEntries])
 
   const getEmptyMessage = () => {
     switch (filter) {
@@ -29,7 +71,26 @@ export function TimelineClient({ initialEntries, stats }: TimelineClientProps) {
   }
 
   return (
-    <div>
+    <div className="space-y-8">
+      {/* Stats Summary */}
+      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
+        {[
+          { label: 'Total Events', value: stats.totalEvents },
+          { label: 'This Week', value: stats.thisWeek },
+          { label: 'Experiences', value: stats.experienceEvents },
+          { label: 'Ideas', value: stats.ideaEvents },
+        ].map((stat) => (
+          <div key={stat.label} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
+            <div className="text-[10px] uppercase font-bold tracking-widest text-[#475569] mb-1">
+              {stat.label}
+            </div>
+            <div className="text-2xl font-bold text-[#e2e8f0]">
+              {stat.value}
+            </div>
+          </div>
+        ))}
+      </div>
+
       <TimelineFilterBar 
         filter={filter} 
         onChange={setFilter} 
@@ -37,18 +98,31 @@ export function TimelineClient({ initialEntries, stats }: TimelineClientProps) {
           all: stats.totalEvents,
           experience: stats.experienceEvents,
           idea: stats.ideaEvents,
-          system: stats.totalEvents - stats.experienceEvents - stats.ideaEvents - (stats.totalEvents > 0 ? 0 : 0), // Simple math for system/github
-          github: 0 // Placeholder until stats service is more granular
+          system: stats.systemEvents,
+          github: stats.githubEvents
         }}
       />
 
-      <div className="space-y-4">
-        {filteredEntries.length > 0 ? (
-          filteredEntries.map(entry => (
-            <TimelineEventCard key={entry.id} entry={entry} />
+      <div className="space-y-12">
+        {groupedEntries.length > 0 ? (
+          groupedEntries.map(group => (
+            <section key={group.label} className="relative">
+              <div className="sticky top-0 z-20 py-4 bg-[#09090b]/80 backdrop-blur-md mb-6">
+                <h2 className="text-xs uppercase font-bold tracking-[0.2em] text-slate-500 flex items-center gap-4">
+                  <span>{group.label}</span>
+                  <div className="h-px flex-1 bg-slate-800/50" />
+                </h2>
+              </div>
+              
+              <div className="space-y-0">
+                {group.entries.map(entry => (
+                  <TimelineEventCard key={entry.id} entry={entry} />
+                ))}
+              </div>
+            </section>
           ))
         ) : (
-          <div className="py-20 text-center">
+          <div className="py-20 text-center border border-dashed border-[#1e1e2e] rounded-2xl bg-[#12121a]/30">
              <p className="text-[#94a3b8]">{getEmptyMessage()}</p>
           </div>
         )}
@@ -56,3 +130,4 @@ export function TimelineClient({ initialEntries, stats }: TimelineClientProps) {
     </div>
   )
 }
+
diff --git a/app/timeline/page.tsx b/app/timeline/page.tsx
index b74eba6..63d0744 100644
--- a/app/timeline/page.tsx
+++ b/app/timeline/page.tsx
@@ -14,8 +14,8 @@ export default async function TimelinePage() {
 
   return (
     <AppShell>
-      <div className="max-w-4xl mx-auto py-8 px-4">
-        <header className="mb-10">
+      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
+        <header className="mb-12">
           <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">
             {COPY.experience.timelinePage.heading}
           </h1>
diff --git a/app/workspace/[instanceId]/WorkspaceClient.tsx b/app/workspace/[instanceId]/WorkspaceClient.tsx
index f403d59..4000741 100644
--- a/app/workspace/[instanceId]/WorkspaceClient.tsx
+++ b/app/workspace/[instanceId]/WorkspaceClient.tsx
@@ -4,6 +4,7 @@ import React, { useState, useEffect, useRef } from 'react';
 import ExperienceRenderer from '@/components/experience/ExperienceRenderer';
 import StepNavigator, { type StepStatus } from '@/components/experience/StepNavigator';
 import type { ExperienceInstance, ExperienceStep } from '@/types/experience';
+import type { ExperienceChainContext } from '@/types/graph';
 import { ROUTES } from '@/lib/routes';
 import { COPY } from '@/lib/studio-copy';
 import Link from 'next/link';
@@ -14,17 +15,18 @@ import { DraftIndicator } from '@/components/common/DraftIndicator';
 interface WorkspaceClientProps {
   instance: ExperienceInstance;
   steps: ExperienceStep[];
+  chainContext?: ExperienceChainContext;
 }
 
-export default function WorkspaceClient({ instance, steps }: WorkspaceClientProps) {
+export default function WorkspaceClient({ instance, steps, chainContext }: WorkspaceClientProps) {
   return (
     <DraftProvider instanceId={instance.id}>
-      <WorkspaceClientInner instance={instance} steps={steps} />
+      <WorkspaceClientInner instance={instance} steps={steps} chainContext={chainContext} />
     </DraftProvider>
   );
 }
 
-function WorkspaceClientInner({ instance, steps }: WorkspaceClientProps) {
+function WorkspaceClientInner({ instance, steps, chainContext }: WorkspaceClientProps) {
   const [currentStepId, setCurrentStepId] = useState<string | null>(null);
   const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({});
   const [showOverview, setShowOverview] = useState(instance.resolution.depth !== 'light');
@@ -207,6 +209,7 @@ function WorkspaceClientInner({ instance, steps }: WorkspaceClientProps) {
 
   // Determine if the current step is completed (for readOnly mode on revisit renderers)
   const isCurrentStepCompleted = currentStepId ? stepStatuses[currentStepId] === 'completed' : false;
+  const allStepsDone = steps.every(s => stepStatuses[s.id] === 'completed');
 
   // Get draft for the current step to pass as initial data
   const currentDraft = currentStepId ? draftCtx.getDraft(currentStepId) : null;
@@ -316,7 +319,22 @@ function WorkspaceClientInner({ instance, steps }: WorkspaceClientProps) {
           </div>
         )}
 
-        <main className="flex-grow overflow-y-auto no-scrollbar relative">
+        <main className="flex-grow overflow-y-auto no-scrollbar pb-20 relative">
+          {/* Chain Context: Upstream Breadcrumb */}
+          {chainContext?.previousExperience && (
+            <div className="w-full max-w-2xl mx-auto px-6 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
+              <Link 
+                href={ROUTES.workspace(chainContext.previousExperience.id)}
+                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/50 border border-indigo-500/20 text-[#6366f1] text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-all group"
+              >
+                <svg className="w-3 h-3 group-hover:-translate-x-1 transition-transform font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
+                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
+                </svg>
+                {chainContext.previousExperience.title}
+              </Link>
+            </div>
+          )}
+
           <ExperienceRenderer 
             instance={instance} 
             steps={steps}
@@ -333,6 +351,27 @@ function WorkspaceClientInner({ instance, steps }: WorkspaceClientProps) {
             readOnly={isCurrentStepCompleted}
             initialDraft={currentDraft}
           />
+
+          {/* Chain Context: Downstream Link (only shown if current instance is complete) */}
+          {(isCompleted || allStepsDone) && chainContext?.suggestedNext && chainContext.suggestedNext.length > 0 && (
+            <div className="w-full max-w-2xl mx-auto px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
+               <div className="p-8 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 backdrop-blur-sm group hover:border-indigo-500/40 transition-all text-center">
+                 <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Next in Chain</div>
+                 <h4 className="text-xl font-bold text-white mb-6 italic tracking-tight leading-tight">
+                   {chainContext.suggestedNext[0].title}
+                 </h4>
+                 <Link 
+                   href={ROUTES.workspace(chainContext.suggestedNext[0].id)}
+                   className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
+                 >
+                   Continue Your Journey
+                   <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
+                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
+                   </svg>
+                 </Link>
+               </div>
+            </div>
+          )}
         </main>
       </div>
     </div>
diff --git a/app/workspace/[instanceId]/page.tsx b/app/workspace/[instanceId]/page.tsx
index 788b51e..c20dd83 100644
--- a/app/workspace/[instanceId]/page.tsx
+++ b/app/workspace/[instanceId]/page.tsx
@@ -1,5 +1,6 @@
 import { notFound } from 'next/navigation';
 import { getExperienceInstanceById } from '@/lib/services/experience-service';
+import { getExperienceChain } from '@/lib/services/graph-service';
 import WorkspaceClient from './WorkspaceClient';
 
 export const dynamic = 'force-dynamic';
@@ -13,18 +14,21 @@ interface WorkspacePageProps {
 export default async function WorkspacePage({ params }: WorkspacePageProps) {
   const { instanceId } = params;
 
-  // Fetch instance + steps from the service
-  const data = await getExperienceInstanceById(instanceId);
+  // Fetch instance + steps + chain context from services
+  const [data, chainContext] = await Promise.all([
+    getExperienceInstanceById(instanceId),
+    getExperienceChain(instanceId)
+  ]);
 
   if (!data) {
     notFound();
   }
 
-  const { steps, ...instance } = data;
+  const { steps, ...instance } = data!;
 
   return (
     <div className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0]">
-      <WorkspaceClient instance={instance} steps={steps} />
+      <WorkspaceClient instance={instance} steps={steps} chainContext={chainContext} />
     </div>
   );
 }
diff --git a/board.md b/board.md
index 819850f..8a526fe 100644
--- a/board.md
+++ b/board.md
@@ -16,31 +16,30 @@
 | Sprint 10 | Curriculum-Aware Experience Engine — Curriculum outlines, GPT gateway, discover registry, coach API, tutor flows, OpenAPI rewrite | TSC ✅ Build ✅ | ✅ Complete — 7 lanes done. Migration 007, 5 gateway endpoints, 3 coach routes, curriculum service, Genkit tutor + grading flows. |
 | Sprint 11 | MiraK Gateway Stabilization + Enrichment Loop — Flat OpenAPI, Cloud Run fixes, enrichment webhook, discover registry | TSC ✅ Build ✅ | ✅ Complete — All lanes done. |
 | Sprint 12 | Learning Loop Productization — Visible Track UI, Checkpoint renderer, Coach Triggers, Synthesis Completion, Pre/In/Post Knowledge | TSC ✅ Build ✅ Browser ✅ | ✅ Complete — 7 lanes done. Three emotional moments fully functional. |
-| Sprint 13 | Goal OS + Skill Map — Goal entity, Skill domains, mastery engine, GPT goal intake, Skill Tree UI, batch endpoints, home summary optimization | TSC ✅ Build ✅ | ✅ Complete — Gate 0 + 7 lanes. Migration 008, Goal CRUD, Skill domains, mastery engine, GPT gateway goal capability, Skills page + SkillTreeGrid, batch grade/knowledge endpoints, home-summary-service. Known debt: discover-registry-to-validator drift (4/6 step types), stale OpenAPI, mastery recompute action mismatch. |
+| Sprint 13 | Goal OS + Skill Map — Goal entity, Skill domains, mastery engine, GPT goal intake, Skill Tree UI, batch endpoints, home summary optimization | TSC ✅ Build ✅ | ✅ Complete — Gate 0 + 7 lanes. Migration 008, Goal/Skill CRUD, mastery engine, SkillTreeGrid, batch endpoints, home-summary-service. |
+| Sprint 14 | Surface the Intelligence — Schema truth pass, Skill Tree upgrade, Focus Today heuristics, mastery visibility, proactive coach, completion retrospective | TSC ✅ Build ✅ Browser ✅ | ✅ Complete — 7 lanes. Fixed discover-registry/validator alignment (7 step types), mastery N+1 (SOP-30), OpenAPI goalId, dead outlineIds. All W items verified. |
 
 ---
 
-# Sprint 14 — Surface the Intelligence
+# Sprint 15 — Chained Experiences + Spontaneity
 
-> **Goal:** Close the gap between what the system **computes** and what the user **sees**. Fix the schema drift from Sprint 13, make skill domains feel like a map (not a scoreboard), make mastery changes visible at checkpoint time, and give the coach teeth.
+> **Goal:** Make the app feel **alive**. Experiences should chain into each other, GPT should be able to interrupt with ephemerals, the re-entry engine should fire at the right moments, and two new surfaces — Timeline and Profile — should make the user's full journey visible.
 >
-> **The test:** (1) GPT can create payloads for all 6 step types that pass validation. (2) Skill domain card shows "2 more experiences to reach practicing." (3) After a checkpoint, the user sees "Evidence recorded — Marketing: 3/5 toward practicing." (4) Coach surfaces proactively after failed checkpoints with context. (5) Focus Today ranks by leverage, not recency. (6) OpenAPI schema matches runtime truth.
+> **The test:** (1) Completing a Questionnaire surfaces a Plan Builder suggestion via the experience graph. (2) GPT can inject an ephemeral challenge that renders instantly as a toast-like card. (3) Re-entry contract fires after completion and shows in GPT state. (4) Friction level is computed and returned in the synthesis packet. (5) Timeline page shows full chronological event history including ephemerals. (6) Profile page reflects accumulated AI-extracted facets.
 >
-> **Core principle:** This sprint ships zero new backend entities. Everything it surfaces already exists in computed form. The work is wiring → UI → polish.
->
-> **UX feedback incorporated:** Items #1 (skill cards as micro-roadmaps), #2 (intelligent Focus Today), #5 (mastery changes inline), #6 (proactive coach), #7 (completion retrospective with specific mastery changes). Items #9 (fog-of-war), #10 (MiraK depth control), #12 (user agency) deferred to Sprint 15+.
+> **Core principle:** The backend infrastructure (graph service, progression rules, re-entry engine, timeline service, facet service) already exists from Sprints 5–7. This sprint is about **wiring it into the lived UX** and making it drive user behavior, not just sit as queryable data.
 
 ---
 
 ## Dependency Graph
 
 ```
-Lane 1:  [W1–W5 SCHEMA TRUTH PASS]                (independent — no UI)
-Lane 2:  [W1–W4 SKILL TREE UPGRADE]                (independent — Skills page + card only)
-Lane 3:  [W1–W3 INTELLIGENT FOCUS TODAY]            (independent — home page section)
-Lane 4:  [W1–W4 MASTERY VISIBILITY + CHECKPOINT]    (independent — checkpoint renderer + completion)
-Lane 5:  [W1–W3 PROACTIVE COACH SURFACING]          (independent — CoachTrigger + ExperienceRenderer)
-Lane 6:  [W1–W4 COMPLETION RETROSPECTIVE]            (independent — CompletionScreen only)
+Lane 1:  [W1–W4 EXPERIENCE CHAINING + GRAPH UI]    (independent — library, completion, workspace)
+Lane 2:  [W1–W4 EPHEMERAL INJECTION SYSTEM]         (independent — home, workspace, GPT gateway)
+Lane 3:  [W1–W4 RE-ENTRY ENGINE + FOLLOW-UPS]       (independent — engine, GPT state, home)
+Lane 4:  [W1–W3 FRICTION SYNTHESIS + WEEKLY LOOPS]   (independent — progression engine, graph service)
+Lane 5:  [W1–W4 TIMELINE PAGE]                       (independent — new page, existing service)
+Lane 6:  [W1–W4 PROFILE PAGE UPGRADE]                (independent — existing page, facet service)
                                     │
                                     ↓
 ALL 6 ──→ Lane 7:  [W1–W6 INTEGRATION + BROWSER QA]
@@ -48,220 +47,238 @@ ALL 6 ──→ Lane 7:  [W1–W6 INTEGRATION + BROWSER QA]
 
 ---
 
-## Sprint 14 Ownership Zones
+## Sprint 15 Ownership Zones
 
 | Zone | Files | Lane |
 |------|-------|------|
-| Schema/contracts | `lib/gateway/discover-registry.ts`, `lib/validators/step-payload-validator.ts`, `public/openapi.yaml`, `gpt-instructions.md`, `lib/services/goal-service.ts` | Lane 1 |
-| Skill Tree UI | `components/skills/SkillTreeCard.tsx`, `components/skills/SkillTreeGrid.tsx`, `components/skills/SkillDomainDetail.tsx` (NEW), `app/skills/page.tsx`, `app/skills/[domainId]/page.tsx` (NEW), `lib/studio-copy.ts` (skills section only) | Lane 2 |
-| Focus Today | `components/common/FocusTodayCard.tsx`, `lib/services/home-summary-service.ts`, `app/page.tsx` (Focus Today section only) | Lane 3 |
-| Mastery visibility | `components/experience/steps/CheckpointStep.tsx`, `components/experience/ExperienceRenderer.tsx` (mastery recompute fix only) | Lane 4 |
-| Coach surfacing | `components/experience/CoachTrigger.tsx`, `components/experience/ExperienceRenderer.tsx` (coach wiring only) | Lane 5 |
-| Completion screen | `components/experience/CompletionScreen.tsx` | Lane 6 |
-| Integration | All pages (read-only browser QA), `lib/routes.ts`, `lib/studio-copy.ts` (final pass) | Lane 7 |
+| Experience graph UI | `components/experience/CompletionScreen.tsx` (chain suggestions section), `app/library/LibraryClient.tsx` (continue/related links), `app/workspace/[instanceId]/WorkspaceClient.tsx` (chain context banner), `lib/services/graph-service.ts` (completion wiring) | Lane 1 |
+| Ephemeral injection | `components/experience/EphemeralToast.tsx` (NEW), `app/page.tsx` (ephemeral section), `app/api/experiences/inject/route.ts` (notification flag), `components/experience/ExperienceRenderer.tsx` (ephemeral auto-chain) | Lane 2 |
+| Re-entry engine | `lib/experience/reentry-engine.ts`, `lib/services/synthesis-service.ts` (GPT state packet), `app/page.tsx` (re-entry prompts section), `components/common/ReentryPromptCard.tsx` (NEW) | Lane 3 |
+| Friction + loops | `lib/experience/progression-engine.ts` (friction in synthesis), `lib/services/graph-service.ts` (loop creation), `lib/services/experience-service.ts` (recurring instance), `types/experience.ts` (recurring fields) | Lane 4 |
+| Timeline page | `app/timeline/page.tsx`, `app/timeline/TimelineClient.tsx`, `components/timeline/TimelineEventCard.tsx`, `components/timeline/TimelineFilterBar.tsx`, `lib/services/timeline-service.ts` | Lane 5 |
+| Profile page | `app/profile/page.tsx`, `app/profile/ProfileClient.tsx`, `components/profile/DirectionSummary.tsx`, `components/profile/FacetCard.tsx`, `components/profile/SkillTrajectory.tsx` (NEW) | Lane 6 |
+| Integration | All pages (read-only browser QA), `board.md`, `agents.md`, `roadmap.md` | Lane 7 |
 
 ---
 
-## Lane 1 — Schema Truth Pass
-
-> Fix the contract drift so GPT can actually create valid payloads and the OpenAPI spec matches runtime.
-
-**W1 — Fix discover registry → validator alignment** ✅
-- **Done (Lane 7)**: Fixed lesson type `example` → `checkpoint` to match validator. Added missing `plan_builder` schema. Fixed typo in `when_to_use`. All 7 step types now match `step-payload-validator.ts`.
-- In `lib/gateway/discover-registry.ts`, update the step payload examples for:
-  - `reflection`: Change `{ prompt, guide }` → `{ prompts: [{ id, text }] }` to match validator
-  - `questionnaire`: Change `questions[].text` → `questions[].label` to match validator
-  - `challenge`: Change `{ problem, constraints[], hints[] }` → `{ objectives: [{ id, description }] }` to match validator
-  - `essay_tasks`: Change `{ prompt, requirements[] }` → `{ content, tasks: [{ id, description }] }` to match validator
-- Cross-reference `lib/validators/step-payload-validator.ts` for each type's required fields
-- Verify `lesson` and `checkpoint` still match (they should already)
-
-**W2 — Update OpenAPI schema** ✅
-- **Done (Lane 7)**: `goal` already in create enum, `goal`+`skill_domains` already in state schema. Added `goalId` to plan endpoint. Added `goal` to discover capability examples.
-- In `public/openapi.yaml`:
-  - Add `goal` to the `createEntity` type enum (alongside experience, ephemeral, idea, step)
-  - Add `goal` and `skill_domains` fields to `getGPTState` response schema
-  - Update description to mention Goal OS
-  - Verify all 6 endpoints are listed with accurate request/response schemas
-
-**W3 — Fix goal service contract gap** ✅
-- **Done (Lane 7)**: `outlineIds` was already absent from `Goal` type and `GoalRow`. Removed the last vestige from `api/goals/route.ts` POST handler. The relationship lives in `curriculum_outlines.goal_id`, not denormalized on Goal.
-- Decision: Remove `outlineIds` from `Goal` type (the relationship lives in `curriculum_outlines.goal_id`, not denormalized on Goal). OR implement `addOutlineToGoal`/`removeOutlineFromGoal` in `goal-service.ts`.
-- Recommended: Remove `outlineIds` from `types/goal.ts` and `GoalRow`. Simplify — the join is through `curriculum_outlines.goal_id`.
-- Update `docs/contracts/goal-os-contract.md` to reflect this decision.
-
-**W4 — Fix mastery recompute action mismatch** ✅
-- **Done (Lane 4, verified Lane 7)**: ExperienceRenderer L129 already sends `action: 'recompute_mastery'` with `goalId` from outline. Also fixed N+1 pattern in `computeSkillMastery()` (SOP-30: single instance fetch + batch knowledge units).
-- In `components/experience/ExperienceRenderer.tsx` (L105): Change `action: 'recompute'` → `action: 'recompute_mastery'`
-- Also pass `goalId` in the PATCH body (resolve from outline.goalId which is already fetched)
-- Verify the fix by tracing: ExperienceRenderer → PATCH /api/skills/:id → `updateDomainMastery(goalId, id)`
-
-**W5 — Update GPT instructions** ✅
-- **Done (Lane 7)**: Verified `gpt-instructions.md` already contains the correct step payload field naming warnings (`reflection` prompts vs prompt, `questionnaire` label vs text) and accurate Goal Intake Protocol (using `goalId` on `create_outline`).
-- In `gpt-instructions.md`: Add a note about step payload field naming for `reflection` (uses `prompts[]` not `prompt`) and `questionnaire` (uses `label` not `text`)
-- Ensure the goal intake protocol section is accurate
+## Lane 1 — Experience Chaining + Graph UI
+
+> Wire the experience graph into the UI so users see "Continue →" and "Related" links. Make the chain visible after completion.
+
+**W1 — CompletionScreen shows chain suggestions from progression rules** ⬜
+- In `components/experience/CompletionScreen.tsx`:
+  - After the existing "Next Suggested Paths" section, add a "Continue Your Chain" section
+  - Call `getSuggestionsForCompletion(instanceId)` from `graph-service.ts`
+  - For each suggestion: show the `templateClass` icon, `reason` text, and a "Start Next →" button
+  - "Start Next →" calls `POST /api/gpt/create` with `type: 'experience'`, `templateClass`, resolution carry-forward, and `previous_experience_id` set to the current instance
+- Uses: `lib/services/graph-service.ts` `getSuggestionsForCompletion()`
+
+**W2 — Library shows "continue" and "related" links on active/completed cards** ⬜
+- In `app/library/LibraryClient.tsx`:
+  - For each active experience card: if `next_suggested_ids` has entries, show "Continue →" link to the first suggested instance
+  - For each completed experience card: if `previous_experience_id` is set, show "← Previous" breadcrumb link
+  - Fetch chain context via the existing `/api/experiences/[id]/chain` route (already exists)
+- Style the links as subtle indigo-tinted pills
+
+**W3 — Workspace shows chain context banner** ⬜
+- In `app/workspace/[instanceId]/WorkspaceClient.tsx` or `page.tsx`:
+  - If the experience has a `previous_experience_id`, show a slim banner at the top: "Part of a chain — Previous: [Title]"
+  - If `next_suggested_ids` exist, show at the bottom: "Up next: [Title] →"
+  - Fetch chain context via `getExperienceChain(instanceId)` from `graph-service.ts`
+
+**W4 — Wire linkExperiences on completion** ⬜
+- In `ExperienceRenderer.tsx` completion handler (or `completeExperienceWithAI`):
+  - After completion, call `getSuggestionsForCompletion(instanceId)` to get the next template class
+  - If GPT has already created a follow-up experience (via `next_suggested_ids`), call `linkExperiences(currentId, nextId, 'chain')` to wire the graph edge
+  - Update the GPT state packet to include `activeChains` and `deepestChain` from `getGraphSummaryForGPT()`
 
 **Done when:**
-- ✅ All 7 step types' discover examples pass `validateStepPayload()` without errors
-- ✅ `openapi.yaml` documents `goal` in create and `goal`+`skill_domains` in state
-- ✅ ExperienceRenderer sends correct `recompute_mastery` action with `goalId`
-- ✅ TSC clean
+- Completion screen shows chain-based suggestions with "Start Next →"
+- Library cards show chain links (continue / previous)
+- Workspace banner shows chain position
+- Graph edges are wired on completion
+- TSC clean
 
 ---
 
-## Lane 2 — Skill Tree Upgrade
-
-> Turn domain cards from scoreboards into micro-roadmaps. Add a domain detail view.
-
-**W1 — Domain card shows "what's needed for next level"** ✅
-- **Done**: Added `evidenceNeeded` metric based on `MASTERY_THRESHOLDS` and formatted the display, along with completed vs total experiences. Added associated copy strings.
-- In `components/skills/SkillTreeCard.tsx`:
-  - Import mastery thresholds from `docs/contracts/goal-os-contract.md` or define constants in `lib/constants.ts` if not already there (e.g., `MASTERY_THRESHOLDS = { aware: 1, beginner: 2, practicing: 5, proficient: 10, expert: 20 }`)
-  - Calculate `evidenceNeeded = threshold[nextLevel] - domain.evidenceCount`
-  - Display below progress bar: "2 more experiences to reach practicing" (or "Max level reached" for expert)
-  - Show count of linked experiences: completed vs total (e.g., "3 of 5 experiences done")
-- Add copy strings to `lib/studio-copy.ts` skills section
-
-**W2 — Domain card shows next uncompleted experience** ✅
-- **Done**: Enhanced payload processing in `app/skills/page.tsx` to compute status distribution and correctly evaluate `_nextExperienceId`. Overhauled `SkillTreeCard` to display uncompleted links and fallback text dynamically.
-- Currently `nextExperienceId = domain.linkedExperienceIds[0]` (always first, regardless of completion)
-- Fetch experience statuses and show the first non-completed one as the "What's next" link
-- If all linked experiences are completed, show "All experiences completed — explore more →" linking to library
-
-**W3 — Domain detail page** ✅
-- **Done**: Created the server component `app/skills/[domainId]/page.tsx` tracking specific domain metadata, lists of mapped experiences via status checks, and fetched knowledge structures directly mapped out nicely with specific matching UI themes. Added the corresponding route to `routes.ts`.
-- Shows: domain name, description, mastery level + badge, progress to next level
-- List of all linked experiences (with status badges: completed/active/proposed)
-- List of all linked knowledge units (with mastery status)
-- Back link to `/skills`
-- Add route to `lib/routes.ts`: `skillDomain: (id: string) => `/skills/${id}``
-
-**W4 — Wire card links to detail page** ✅
-- **Done**: Transformed `<SkillTreeCard>` header wrapper to a `<Link>` block routing back into the newly registered destination and passed strictly formatted metadata objects within `SkillTreeGrid.tsx`.
-- In `SkillTreeCard.tsx`: Make the card title clickable, linking to the detail page
-- In `SkillTreeGrid.tsx`: Ensure the grid passes through domain IDs correctly
+## Lane 2 — Ephemeral Injection System
+
+> Let GPT drop interruptive micro-experiences that appear as toast-like prompts. Make ephemeral creation feel instant and alive.
+
+**W1 — EphemeralToast component** ✅
+- **Done**: Created `EphemeralToast.tsx` with slide-in animation, auto-dismiss progress bar, and "Start Now" navigation. 
+- Create `components/experience/EphemeralToast.tsx`:
+  - A floating card component (bottom-right or top of page) that announces a new ephemeral experience
+  - Props: `title`, `goal`, `experienceClass`, `instanceId`, `onDismiss`, `onStart`
+  - "Start Now →" button navigates to `/workspace/${instanceId}`
+  - "Later" button dismisses (stores dismissed ID in sessionStorage)
+  - Auto-dismiss after 15 seconds with a progress bar
+  - Dark theme, indigo accent, subtle slide-in animation
+
+**W2 — Home page ephemeral section** ✅
+- **Done**: Added "Just Dropped" section to `app/page.tsx` and updated `home-summary-service.ts` to fetch pending injected ephemerals.
+- In `app/page.tsx`:
+  - Query for recent ephemeral experiences in `injected` status (created in the last 24h, not yet started)
+  - Render them in a "Spontaneous" or "Just Dropped" section below Focus Today
+  - Each card shows title, class icon, and "Jump In →" link
+  - If no pending ephemerals, section is hidden (not empty state)
+
+**W3 — Inject route returns notification metadata** ✅
+- **Done**: Updated `api/experiences/inject/route.ts` to return `notification` object and added `urgency` validation to `experience-validator.ts`.
+- In `app/api/experiences/inject/route.ts`:
+  - After creating the ephemeral instance, include `notification: { show: true, toast: true }` in the response
+  - This metadata enables the GPT or frontend to decide whether to show the toast
+  - Add optional `urgency: 'low' | 'medium' | 'high'` field to the inject request schema
+  - Urgency maps to toast duration: low=15s, medium=30s, high=persistent
+
+**W4 — GPT discover entry for ephemeral injection** ✅
+- **Done**: Updated `lib/gateway/discover-registry.ts` with `urgency` parameter in `create_ephemeral` capability and refined usage guidance.
+- In `lib/gateway/discover-registry.ts`:
+  - Verify the existing `ephemeral` capability has an accurate example including `urgency` and notification metadata
+  - Add `when_to_use` guidance: "Drop micro-challenges, trend alerts, or quick daily reflections. Fire-and-forget. User sees a toast and can choose to engage."
 
 **Done when:**
-- Card shows evidence needed for next level
-- Card links to first uncompleted experience (not always first)
-- Detail page renders with linked experiences + knowledge units
-- Route in `lib/routes.ts`
-- TSC clean
+- EphemeralToast renders with slide-in animation and auto-dismiss
+- Home page shows pending ephemerals in a dedicated section
+- Inject route returns notification metadata
+- GPT discover registry has accurate ephemeral guidance
+- TSC clean (Note: Existing errors in Lane 6 / profile-service, Lane 2 is clean)
 
 ---
 
-## Lane 3 — Intelligent Focus Today
-
-> Rank the focus card by leverage, not recency. Show a priority reason.
-
-**W1 — Priority heuristic in home-summary-service** ✅
-- **Done**: Replaced recency sort with a comprehensive heuristic prioritizing scheduled dates, proximity to mastery, and failed checkpoints in `home-summary-service`.
-- In `lib/services/home-summary-service.ts`, replace the current "most recent activity" sort with a priority ranking:
-  1. Experiences with `scheduled_date` today or overdue → highest priority
-  2. Experiences in domains closest to mastery threshold (e.g., 1 experience away from next level)
-  3. Experiences with failed checkpoints (user should retry)
-  4. Recency fallback (current behavior)
-- Return `focusReason: string` alongside the focus experience (e.g., "This domain is 1 experience away from practicing")
-- Compute domain proximity using skill_domains data already fetched in the summary
+## Lane 3 — Re-Entry Engine + Follow-Up Prompts
 
-**W2 — FocusTodayCard shows priority reason** ✅
-- **Done**: Added `focusReason` optional string prop and rendered a compact, styled tag above the experience title.
-  - Accept `focusReason?: string` prop
-  - Show the reason as a small tag/badge above the experience title: e.g., "📈 Closest to leveling up" or "📅 Scheduled for today"
-  - Style consistently with the existing indigo accent palette
+> Harden the re-entry engine and surface re-entry prompts on the home page so the user feels pulled back in.
 
-**W3 — Wire focus reason through page** ✅
-- **Done**: Passed the computed `focusReason` from `summary.focusExperience.focusReason` directly into `<FocusTodayCard>` in `app/page.tsx`.
+**W1 — Re-entry engine: add `time` and `manual` triggers** ✅
+- **Done**: Added `time` and `manual` triggers, implemented batch interaction fetching to fix N+1, and added `priority` logic with sorting.
+**W2 — ReentryPromptCard component** ✅
+- **Done**: Created `ReentryPromptCard.tsx` with priority/trigger badges and dark theme styling consistent with `FocusTodayCard`.
+**W3 — Home page "Pick Up Where You Left Off" section** ✅
+- **Done**: Wired `evaluateReentryContracts` to the home page, sorted by priority, and added the "Pick Up Where You Left Off" section with a "View all" link.
+**W4 — GPT state includes re-entry prompts with priority** ✅
+- **Done**: Modified `buildGPTStatePacket` to explicitly carry prompt priority and added `reentryCount` to the state packet for GPT awareness.
 
 **Done when:**
-- Focus Today shows the highest-leverage experience, not just most recent
-- A reason tag appears explaining why this experience is recommended
-- Fallback to recency when no heuristic applies
+- Re-entry engine supports `time` and `manual` triggers
+- Inactivity trigger uses batch fetch (no N+1)
+- Re-entry prompts appear on home page with priority badges
+- GPT state packet includes prompt priorities
 - TSC clean
 
 ---
 
-## Lane 4 — Mastery Visibility & Checkpoint Feedback
+## Lane 4 — Friction Synthesis + Weekly Loops
 
-> After a checkpoint, show the user what moved. Don't let mastery changes be silent.
+> Wire friction computation into the synthesis loop. Enable recurring experience instances.
 
-**W1 — Checkpoint results show mastery impact inline** ✅
-- **Done**: Added a mastery impact callout in the CheckpointStep results view that fetches and displays evidence count and progress for the relevant skill domain.
+**W1 — Friction level persisted in synthesis snapshot** ✅
+- In `lib/services/experience-service.ts` `completeExperienceWithAI()`: moved `updateInstanceFriction()` before synthesis.
+- In `synthesis-service.ts` `createSynthesisSnapshot()`: pulling `friction_level` into `key_signals`.
+- In `buildGPTStatePacket()`: ensure `frictionSignals` are in the compressed state narrative.
 
-**W2 — Mastery toast on knowledge progress promotion** ✅
-- **Done**: Implemented a floating toast notification that appears when a knowledge unit's mastery status is promoted following successful grading.
+**W2 — Weekly loop service function** ✅
+- In `lib/services/graph-service.ts`: added `createLoopInstance()` to clone experiences for recurrence and `getLoopHistory()`.
 
-**W3 — Fix ExperienceRenderer mastery recompute call** ✅
-- **Done**: Verified that the mastery recompute action is correctly set to 'recompute_mastery' and passes the required goalId.
-
-**W4 — Add domain name to checkpoint grading context** ✅
-- **Done**: Updated ExperienceRenderer to pass the domain name from the outline to CheckpointStep, which now uses it to fetch and display accurate mastery impact.
+**W3 — Loop creation wired to completion** ✅
+- In `completeExperienceWithAI()`: added logic to automatically spawn loop instances and link them when `timeScope` is 'ongoing'.
+- Set loop status to `proposed` for visibility in Library.
 
 **Done when:**
-- After checkpoint grading, a callout shows evidence count / threshold for the relevant domain
-- Knowledge progress promotions produce a visible toast
-- Mastery recompute actually fires correctly (action name + goalId)
+- Friction level flows into synthesis snapshots
+- `createLoopInstance()` creates linked recurring instances
+- Loop creation fires automatically for ongoing/time-triggered experiences
+- Loop history is queryable via `getLoopInstances()`
 - TSC clean
 
-> ⚠️ **Coordination note:** Lane 4 W3 and Lane 1 W4 both touch `ExperienceRenderer.tsx` mastery effect. Lane 1 owns the fix. Lane 4 should verify it works after Lane 1 completes, or stub with correct action name if working in parallel. The ownership zone for ExperienceRenderer is split: Lane 4 owns the mastery recompute block (L86-115), Lane 5 owns coach wiring.
-
 ---
 
-## Lane 5 — Proactive Coach Surfacing
+## Lane 5 — Timeline Page
 
-> Make the coach surface at the right moments with context, not just wait at the bottom.
+> Upgrade the existing timeline page stub into a real, filterable event feed.
 
-**W1 — Coach surfaces with context after failed checkpoint** ✅
-- In `components/experience/CoachTrigger.tsx`:
-  - When `failedCheckpoint` is true, enhance the trigger label to include the missed question context
-  - Accept optional `missedQuestions?: string[]` prop from ExperienceRenderer
-  - Label becomes: "You missed a few points. Want to review [topic]? 💬" instead of generic "Need help?"
-- In `ExperienceRenderer.tsx`: Pass missed question text to CoachTrigger when `handleGradeComplete` fires with failures
-- **Done**: Added `missedQuestions` mapping from failed questions in ExperienceRenderer and updated CoachTrigger text.
+**W1 — Timeline page server component** ✅
+- In `app/timeline/page.tsx`: 
+  - Upgraded to fetch real data via `getTimelineEntries(userId)` and `getTimelineStats`
+  - Added `export const dynamic = 'force-dynamic'` for fresh data
+  - Passed stats (Total, Week, etc.) to the client for the summary section
 
-**W2 — Pre-step knowledge primer callout** ✅
-- In `components/experience/CoachTrigger.tsx`:
-  - For the `unread_knowledge` trigger type: enhance the message to include a direct "Review now →" link that navigates to the knowledge unit
-  - Add a `knowledgeUnitLink` field derived from the pre_support link's `knowledgeUnitId`
-  - Format: "📖 Review '[Unit Title]' before starting → [link to /knowledge/:id]"
-- **Done**: Enhanced unread_knowledge trigger dynamically generate a visible Next.js Link instead of a text prompt.
+**W2 — TimelineClient with filtering** ✅
+- In `app/timeline/TimelineClient.tsx`:
+  - Implemented category filter tabs with dynamic counts (All, Experiences, Ideas, System, GitHub)
+  - Implemented date-based grouping: "Today", "Yesterday", "This Week", "Earlier"
+  - Added stats summary block at the top showing key trajectory metrics
 
-**W3 — Tutor redirect wiring on checkpoint fail** ✅
-- In `CheckpointStep.tsx` L226-234: The "Get Help" button for `on_fail === 'tutor_redirect'` currently has `onClick={() => {}}` (noop)
-- Wire it to call `onOpenCoach()` — pass through a new `onOpenCoach` prop from ExperienceRenderer
-- OR fire a custom event that CoachTrigger listens for
-- **Done**: Added `onOpenCoach` to CheckpointStep props, passed it down from ExperienceRenderer, and wired the Get Help button to invoke it.
+**W3 — TimelineEventCard upgrade** ✅
+- In `components/timeline/TimelineEventCard.tsx`:
+  - Upgraded styling for the dark studio theme with premium hover effects
+  - Category-specific color coding (indigo for experience, amber for idea, etc.)
+  - Relative time display using `lib/date.ts`
+  - Added "⚡ Ephemeral" badge for ephemeral injections
+
+**W4 — Timeline service: add ephemeral + knowledge events** ✅
+- In `lib/services/timeline-service.ts`:
+  - Added knowledge unit arrival events (last 7 days)
+  - Added mastery promotion events from `knowledge_progress`
+  - Distinguished ephemeral injections in experience entries with metadata
+  - Enhanced stats service to include system and github categories
 
 **Done when:**
-- Failed checkpoint coach trigger includes question-level context
-- Unread knowledge trigger shows unit title and link
-- "Get Help" button on checkpoint fail opens the tutor chat
-- TSC clean
+- Timeline page renders real data with category filters
+- Event cards have category colors, relative time, entity links
+- Ephemeral events and knowledge arrivals appear in the feed
+- Stats summary at top
+- TSC clean (verified for timeline files specifically)
 
 ---
 
-## Lane 6 — Completion Retrospective
-
-> Make the completion screen a mini-retrospective that shows what specifically changed.
-
-**W1 — Show specific mastery domain changes** ✅
-- **Done**: Added "What Moved" section that compares current evidence against thresholds to dynamically determine prior state and clearly displays transitions, utilizing a color-coded interface mirroring the SkillTreeCard.
-
-**W2 — Show step-level summary** ✅
-- **Done**: Implemented "What You Did" section that aggregates total step counts, checkpoint pass rates, and drafts saved from the active session's tracking payload.
-
-**W3 — Improve "Next Suggested Paths" with domain context** ✅
-- **Done**: Enhanced candidates rendering to cross-reference with domain names, automatically converting matched names into clickable links with their respective mastery badges.
-
-**W4 — Loading state polish** ✅
-- **Done**: Added skeleton outlines below the synthesizing spinner to reduce visual jumping when data hydration completes.
+## Lane 6 — Profile Page Upgrade
+
+> Transform the existing profile page from a skeleton into a living dashboard reflecting the user's accumulated trajectory.
+
+**W1 — Profile page: Goal + Skill Trajectory section** ✅
+- **Done**: Added goal and skill domain fetching to `ProfilePage`, and created a new responsive `SkillTrajectory` component that visualizes mastery progress toward evidence-based milestones.
+- In `app/profile/page.tsx`:
+  - Fetch goal data via `getGoals(userId)` from `goal-service.ts`
+  - Fetch skill domains via `getSkillDomains(userId)` from `skill-domain-service.ts`
+  - Pass to a new `SkillTrajectory` component
+- Create `components/profile/SkillTrajectory.tsx`:
+  - Shows active goal title + status badge
+  - Below: mastery levels for each linked skill domain as a horizontal bar chart
+  - Each bar: domain name, current mastery level label, evidence count / threshold progress
+  - Color coding: undiscovered=slate, aware=sky, beginner=amber, practicing=emerald, proficient=indigo, expert=purple
+
+**W2 — Profile page: Experience History summary** ✅
+- **Done**: Enhanced `UserProfile` with advanced activity metrics (completion rate, top focus class, average friction) and implemented an "Activity" dashboard in `ProfileClient`.
+- In `app/profile/ProfileClient.tsx`:
+  - Add an "Activity" section showing experience count breakdown: total, completed, active, ephemeral
+  - Show completion rate percentage
+  - Show most active experience class (computed from completed experiences by template class)
+  - Show average friction level across completed experiences
+
+**W3 — FacetCard upgrade** ✅
+- **Done**: Upgraded `FacetCard` with confidence indicators (dots), evidence snippets, "Strong Signal" badges, and source snapshot references.
+- In `components/profile/FacetCard.tsx`:
+  - Add confidence indicators (dots or progress ring)
+  - Show evidence string if present (from AI extraction)
+  - Add "inferred from [N experiences]" source attribution
+  - Highest-confidence facets get a "Strong Signal" badge
+
+**W4 — DirectionSummary shows goal alignment** ✅
+- **Done**: Enhanced `DirectionSummary` with active goal trajectory callouts, strongest domain highlights, and semantic pattern insights based on profile facets.
+- In `components/profile/DirectionSummary.tsx`:
+  - Upgrade props to include `activeGoal` and `skillDomains`.
+  - Add Active goal callout with inline mastery snapshot
+  - Add "Strongest domain: [Name] at [Level]" highlight
+  - Add "Emerging pattern: [preferred_mode facet]" insight
+  - Add "Time investment: [X experiences, Y hours estimated]" based on `estimated_minutes` heuristic.
 
 **Done when:**
-- "What Moved" section shows domain mastery changes from this experience
-- "What You Did" section shows step/checkpoint/draft counts
-- Next paths link to skill domains when applicable
-- Loading → complete transition is smooth
-- TSC clean
+- Profile shows goal + skill trajectory with mastery bars ✅
+- Activity section shows experience breakdown + friction averages ✅
+- Facets are grouped and display confidence + evidence ✅
+- Direction summary includes goal alignment insights ✅
+- TSC clean (verified via npx tsc --noEmit) ✅
 
 ---
 
@@ -269,36 +286,43 @@ ALL 6 ──→ Lane 7:  [W1–W6 INTEGRATION + BROWSER QA]
 
 > Cross-lane wiring, regression checks, browser testing, documentation sync.
 
-**W1 — Cross-lane type verification** ⬜
+**W1 — Cross-lane type verification** ✅
+- **Done**: TSC clean with all 6 lanes merged. Fixed 4 issues from engineer review:
+  1. **BLOCKER**: `CompletionScreen.handleStartNext` payload now sends `template_id` + `user_id` + full instance shape (was sending `templateClass` + `userId` which would fail `createExperienceInstance`).
+  2. **Verified**: GPT state DOES include re-entry priority and `reentryCount` (lines 110-118 of `synthesis-service.ts`). Board was accurate — no fix needed.
+  3. **Fixed**: `entityType: 'experience' as any` in `timeline-service.ts` → proper `'knowledge'` type (added to `TimelineEntry.entityType` union).
+  4. **Fixed**: `urgency="medium"` hardcoded on home toast → now maps from `resolution.intensity` (low→low, moderate→medium, high→high).
 - Run `npx tsc --noEmit` — must pass with all 6 lanes merged
 - Run `npm run build` — must succeed
 
-**W2 — Browser QA: Skills page** ⬜
-- Verify SkillTreeCard shows "X more to reach [level]"
-- Verify card title links to domain detail page
-- Verify domain detail page renders with linked experiences + knowledge
-
-**W3 — Browser QA: Home page** ⬜
-- Verify Focus Today shows priority reason tag
-- Verify it picks the highest-leverage experience (not just most recent)
-
-**W4 — Browser QA: Checkpoint flow** ⬜
-- Complete a checkpoint with mixed correct/incorrect answers

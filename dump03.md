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

```

### lib/services/draft-service.ts

```typescript
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'
import { Artifact } from '@/types/interaction'

export interface DraftMetadata {
  step_id: string
  instance_id: string
  saved_at: string
}

/**
 * Service for managing step-level work-in-progress drafts.
 * Drafts are stored in the artifacts table with artifact_type = 'step_draft'.
 */
export async function saveDraft(instanceId: string, stepId: string, userId: string, content: Record<string, any>): Promise<void> {
  const adapter = getStorageAdapter()
  
  // 1. Fetch existing drafts for this instance to find a match
  const artifacts = await adapter.query<Artifact>('artifacts', { 
    instance_id: instanceId,
    artifact_type: 'step_draft'
  })
  
  const existingArtifact = artifacts.find(a => a.metadata?.step_id === stepId)
  
  const metadata: DraftMetadata = {
    step_id: stepId,
    instance_id: instanceId,
    saved_at: new Date().toISOString()
  }
  
  const contentStr = JSON.stringify(content)
  
  if (existingArtifact) {
    // 2. Update existing draft
    await adapter.updateItem<Artifact>('artifacts', existingArtifact.id, {
      content: contentStr,
      metadata
    })
  } else {
    // 3. Create new draft
    const newArtifact: Omit<Artifact, 'id'> = {
      instance_id: instanceId,
      artifact_type: 'step_draft',
      title: `Draft for step ${stepId}`,
      content: contentStr,
      metadata
    }
    await adapter.saveItem<Artifact>('artifacts', {
      ...newArtifact,
      id: generateId()
    } as Artifact)
  }
}

export async function getDraft(instanceId: string, stepId: string): Promise<Record<string, any> | null> {
  const adapter = getStorageAdapter()
  
  const artifacts = await adapter.query<Artifact>('artifacts', { 
    instance_id: instanceId,
    artifact_type: 'step_draft'
  })
  
  const artifact = artifacts.find(a => a.metadata?.step_id === stepId)
  
  if (!artifact) return null
  
  try {
    return JSON.parse(artifact.content)
  } catch (e) {
    console.error('[DraftService] Failed to parse draft content:', e)
    return null
  }
}

export async function getDraftsForInstance(instanceId: string): Promise<Record<string, Record<string, any>>> {
  const adapter = getStorageAdapter()
  
  const artifacts = await adapter.query<Artifact>('artifacts', { 
    instance_id: instanceId,
    artifact_type: 'step_draft'
  })
  
  const drafts: Record<string, Record<string, any>> = {}
  
  for (const artifact of artifacts) {
    const stepId = artifact.metadata?.step_id
    if (stepId) {
      try {
        drafts[stepId] = JSON.parse(artifact.content)
      } catch (e) {
        console.warn(`[DraftService] Failed to parse draft content for step ${stepId}:`, e)
      }
    }
  }
  
  return drafts
}

export async function deleteDraft(instanceId: string, stepId: string): Promise<void> {
  const adapter = getStorageAdapter()
  
  const artifacts = await adapter.query<Artifact>('artifacts', { 
    instance_id: instanceId,
    artifact_type: 'step_draft'
  })
  
  const artifact = artifacts.find(a => a.metadata?.step_id === stepId)
  
  if (artifact) {
    await adapter.deleteItem('artifacts', artifact.id)
  }
}

```

### lib/services/drill-service.ts

```typescript
import type { DrillSession } from '@/types/drill'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

export async function getDrillSessionByIdeaId(ideaId: string): Promise<DrillSession | undefined> {
  const adapter = getStorageAdapter()
  const sessions = await adapter.getCollection<DrillSession>('drillSessions')
  return sessions.find((s) => s.ideaId === ideaId)
}

export async function saveDrillSession(data: Omit<DrillSession, 'id'>): Promise<DrillSession> {
  const adapter = getStorageAdapter()
  const session: DrillSession = {
    ...data,
    id: generateId(),
    completedAt: data.completedAt ?? new Date().toISOString(),
  }
  return adapter.saveItem<DrillSession>('drillSessions', session)
}

```

### lib/services/experience-service.ts

```typescript
import { ExperienceInstance, ExperienceStatus, InstanceType, ExperienceTemplate, ExperienceStep, ReentryContract } from '@/types/experience'
export type { ExperienceInstance, ExperienceStatus, InstanceType, ExperienceTemplate, ExperienceStep, ReentryContract } from '@/types/experience'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'
import { createSynthesisSnapshot } from './synthesis-service'
import { extractFacetsWithAI } from './facet-service'
import { updateInstanceFriction } from '@/lib/experience/progression-engine'

export async function getExperienceTemplates(): Promise<ExperienceTemplate[]> {
  const adapter = getStorageAdapter()
  return adapter.getCollection<ExperienceTemplate>('experience_templates')
}

export async function getExperienceInstances(filters?: { status?: ExperienceStatus; instanceType?: InstanceType; userId?: string }): Promise<ExperienceInstance[]> {
  const adapter = getStorageAdapter()
  if (filters) {
    const queryFilters: Record<string, any> = {}
    if (filters.status) queryFilters.status = filters.status
    if (filters.instanceType) queryFilters.instance_type = filters.instanceType
    if (filters.userId) queryFilters.user_id = filters.userId
    return adapter.query<ExperienceInstance>('experience_instances', queryFilters)
  }
  return adapter.getCollection<ExperienceInstance>('experience_instances')
}

export async function getExperienceInstanceById(id: string): Promise<(ExperienceInstance & { steps: ExperienceStep[] }) | null> {
  const adapter = getStorageAdapter()
  const instances = await adapter.query<ExperienceInstance>('experience_instances', { id })
  const instance = instances[0]
  if (!instance) return null

  const steps = await getExperienceSteps(id)
  return { ...instance, steps }
}

export async function createExperienceInstance(data: Omit<ExperienceInstance, 'id' | 'created_at'>): Promise<ExperienceInstance> {
  if (!data.resolution) {
    throw new Error('Resolution is required for creating an experience instance')
  }
  const adapter = getStorageAdapter()
  const instance: ExperienceInstance = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString()
  } as ExperienceInstance

  return adapter.saveItem<ExperienceInstance>('experience_instances', instance)
}

export async function updateExperienceInstance(id: string, updates: Partial<ExperienceInstance>): Promise<ExperienceInstance | null> {
  const adapter = getStorageAdapter()
  return adapter.updateItem<ExperienceInstance>('experience_instances', id, updates)
}

export async function getExperienceSteps(instanceId: string): Promise<ExperienceStep[]> {
  const adapter = getStorageAdapter()
  const steps = await adapter.query<ExperienceStep>('experience_steps', { instance_id: instanceId })
  return (steps as ExperienceStep[]).sort((a, b) => a.step_order - b.step_order)
}

export async function createExperienceStep(data: Omit<ExperienceStep, 'id'>): Promise<ExperienceStep> {
  const adapter = getStorageAdapter()
  const step: ExperienceStep = {
    ...data,
    id: generateId()
  } as ExperienceStep
  return adapter.saveItem<ExperienceStep>('experience_steps', step)
}

import { ExperienceTransitionAction, canTransitionExperience, getNextExperienceState } from '@/lib/state-machine'

export async function transitionExperienceStatus(id: string, action: ExperienceTransitionAction): Promise<ExperienceInstance | null> {
  const instance = await getExperienceInstanceById(id)
  if (!instance) return null

  if (!canTransitionExperience(instance.status, action)) {
    console.error(`Invalid experience transition from ${instance.status} with action ${action}`)
    return null
  }

  const nextStatus = getNextExperienceState(instance.status, action)
  if (!nextStatus) return null

  const updates: Partial<ExperienceInstance> = { status: nextStatus }

  if (action === 'publish') {
    updates.published_at = new Date().toISOString()
  }

  return updateExperienceInstance(id, updates)
}

export async function getActiveExperiences(userId: string): Promise<ExperienceInstance[]> {
  const experiences = await getExperienceInstances({ userId, instanceType: 'persistent' })
  return experiences.filter(exp => ['active', 'published'].includes(exp.status))
}

export async function getCompletedExperiences(userId: string): Promise<ExperienceInstance[]> {
  return getExperienceInstances({ userId, status: 'completed' })
}

export async function getEphemeralExperiences(userId: string): Promise<ExperienceInstance[]> {
  return getExperienceInstances({ userId, instanceType: 'ephemeral' })
}

export async function getProposedExperiences(userId: string): Promise<ExperienceInstance[]> {
  const experiences = await getExperienceInstances({ userId, instanceType: 'persistent' })
  return experiences.filter(exp => 
    ['proposed', 'drafted', 'ready_for_review', 'approved'].includes(exp.status)
  )
}

export async function getResumeStepIndex(instanceId: string): Promise<number> {
  const { getInteractionsByInstance } = await import('./interaction-service')
  const interactions = await getInteractionsByInstance(instanceId)
  
  // Find highest step_id from task_completed events
  const completions = interactions.filter(i => i.event_type === 'task_completed')
  if (completions.length === 0) return 0

  // Map back to step orders. step_id in interaction might be the UUID.
  // We need to fetch steps to map UUID -> order.
  const steps = await getExperienceSteps(instanceId)
  const completedStepIds = new Set(completions.map(c => c.step_id))
  
  let highestOrder = -1
  for (const step of steps) {
    if (completedStepIds.has(step.id)) {
      highestOrder = Math.max(highestOrder, step.step_order)
    }
  }

  return Math.min(highestOrder + 1, steps.length - 1)
}

/**
 * Batch creation of experience steps.
 * Assigns IDs and inserts all in one go (adapter-dependent).
 */
export async function createExperienceSteps(steps: Omit<ExperienceStep, 'id'>[]): Promise<ExperienceStep[]> {
  const adapter = getStorageAdapter()
  const created: ExperienceStep[] = []
  
  for (const stepData of steps) {
    const step: ExperienceStep = {
      ...stepData,
      id: generateId()
    } as ExperienceStep
    const saved = await adapter.saveItem<ExperienceStep>('experience_steps', step)
    created.push(saved)
  }
  
  return created
}

/**
 * Update an individual step's payload, title, or completion rule.
 */
export async function updateExperienceStep(stepId: string, updates: Partial<ExperienceStep>): Promise<ExperienceStep | null> {
  const adapter = getStorageAdapter()
  return adapter.updateItem<ExperienceStep>('experience_steps', stepId, updates)
}

/**
 * Permanently remove a step from an experience.
 */
export async function deleteExperienceStep(stepId: string): Promise<void> {
  const adapter = getStorageAdapter()
  await adapter.deleteItem('experience_steps', stepId)
}

/**
 * Reorder all steps for an experience instance based on a provided array of step IDs.
 */
export async function reorderExperienceSteps(instanceId: string, orderedIds: string[]): Promise<ExperienceStep[]> {
  const steps = await getExperienceSteps(instanceId);
  const stepMap = new Map(steps.map(s => [s.id, s]));

  // Validate all IDs belong to this experience and no duplicates
  if (orderedIds.length !== steps.length) {
    throw new Error(`Invalid reorder request: expected ${steps.length} IDs, got ${orderedIds.length}`);
  }
  
  const updatedSteps: ExperienceStep[] = [];
  const adapter = getStorageAdapter();

  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    const step = stepMap.get(id);
    if (!step) {
      throw new Error(`Step ID ${id} does not belong to experience ${instanceId}`);
    }
    
    // Update step_order in place and save
    const updated = await adapter.updateItem<ExperienceStep>('experience_steps', id, { step_order: i });
    updatedSteps.push(updated);
  }

  return updatedSteps.sort((a, b) => a.step_order - b.step_order);
}

/**
 * Insert a new step after a specific step ID and shift subsequent step orders.
 */
export async function insertStepAfter(instanceId: string, afterStepId: string, stepData: Omit<ExperienceStep, 'id'>): Promise<ExperienceStep> {
  const steps = await getExperienceSteps(instanceId);
  const afterStepIndex = steps.findIndex(s => s.id === afterStepId);
  
  if (afterStepIndex === -1) {
    throw new Error(`Step ID ${afterStepId} not found in experience ${instanceId}`);
  }

  const afterOrder = steps[afterStepIndex].step_order;
  const adapter = getStorageAdapter();

  // Shift all steps with step_order > afterOrder up by 1
  for (let i = afterStepIndex + 1; i < steps.length; i++) {
    const step = steps[i];
    await adapter.updateItem<ExperienceStep>('experience_steps', step.id, { step_order: step.step_order + 1 });
  }

  // Create new step at afterOrder + 1
  const newStep: ExperienceStep = {
    ...stepData,
    id: generateId(),
    step_order: afterOrder + 1
  } as ExperienceStep;
  
  return adapter.saveItem<ExperienceStep>('experience_steps', newStep);
}

import { SynthesisSnapshot } from '@/types/synthesis'

/**
 * AI-enriched completion service function for Sprint 7 (Lane 5)
 * Orchestrates post-completion processing: synthesis, facet extraction, and friction update.
 */
export async function completeExperienceWithAI(instanceId: string, userId: string): Promise<SynthesisSnapshot> {
  // 1. Update friction level first so it's available for synthesis
  await updateInstanceFriction(instanceId);

  // 2. Create synthesis snapshot (now AI-powered via Lane 4's changes)
  const snapshot = await createSynthesisSnapshot(userId, 'experience', instanceId);
  
  // 3. Extract facets with AI (now linking to the snapshot)
  await extractFacetsWithAI(userId, instanceId, snapshot.id);

  // 4. Handle weekly loops (Sprint 15 Lane 4)
  const instance = await getExperienceInstanceById(instanceId);
  if (instance?.reentry?.trigger === 'time' && instance.resolution.timeScope === 'ongoing') {
    const { createLoopInstance, linkExperiences } = await import('./graph-service');
    const newInstance = await createLoopInstance(userId, instance.template_id, instanceId);
    await linkExperiences(instanceId, newInstance.id, 'loop');
  }

  return snapshot;
}

/**
 * Gateway-compatible wrapper for ephemeral injection.
 * Handles validation and step creation in sequence.
 */
export async function injectEphemeralExperience(data: any): Promise<ExperienceInstance> {
  // Use existing route-level logic but inside a service
  const { createExperienceInstance, createExperienceStep } = await import('./experience-service')
  
  const instanceData: Omit<ExperienceInstance, 'id' | 'created_at'> = {
    user_id: data.userId,
    template_id: data.templateId,
    idea_id: null,
    title: data.title || 'Injected Experience',
    goal: data.goal || '',
    instance_type: 'ephemeral',
    status: 'injected',
    resolution: data.resolution,
    reentry: null,
    previous_experience_id: null,
    next_suggested_ids: [],
    friction_level: null,
    source_conversation_id: data.source_conversation_id || null,
    generated_by: data.generated_by || 'gpt',
    realization_id: null,
    published_at: null
  }

  const instance = await createExperienceInstance(instanceData)

  if (data.steps && Array.isArray(data.steps)) {
    for (let i = 0; i < data.steps.length; i++) {
      const step = data.steps[i]
      await createExperienceStep({
        instance_id: instance.id,
        step_order: i,
        step_type: step.step_type || step.type,
        title: step.title || '',
        payload: step.payload || {},
        completion_rule: step.completion_rule || null
      })
    }
  }

  return instance;
}

/**
 * Gateway-compatible wrapper for adding a single step to an existing experience.
 */
export async function addStep(experienceId: string, stepData: any): Promise<ExperienceStep> {
  const steps = await getExperienceSteps(experienceId)
  const nextOrder = steps.length > 0 
    ? Math.max(...steps.map(s => s.step_order)) + 1 
    : 0

  return createExperienceStep({
    instance_id: experienceId,
    step_order: nextOrder,
    step_type: stepData.step_type || stepData.type,
    title: stepData.title || '',
    payload: stepData.payload || {},
    completion_rule: stepData.completion_rule || null
  })
}

```

### lib/services/external-refs-service.ts

```typescript
/**
 * lib/services/external-refs-service.ts
 * Bidirectional mapping between local Mira entities and external provider records.
 * All reads/writes go through the storage adapter (SOP-6 + SOP-9).
 */

import type { ExternalRef, ExternalProvider } from '@/types/external-ref'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

type CreateExternalRefInput = Omit<ExternalRef, 'id' | 'createdAt'>

/** Create and persist a new ExternalRef. Returns the created record. */
export async function createExternalRef(data: CreateExternalRefInput): Promise<ExternalRef> {
  const adapter = getStorageAdapter()
  const ref: ExternalRef = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ...data,
  }
  return adapter.saveItem<ExternalRef>('externalRefs', ref)
}

/** All ExternalRefs for a specific local entity. */
export async function getExternalRefsForEntity(
  entityType: ExternalRef['entityType'],
  entityId: string
): Promise<ExternalRef[]> {
  const adapter = getStorageAdapter()
  const refs = await adapter.getCollection<ExternalRef>('externalRefs')
  return refs.filter((r) => r.entityType === entityType && r.entityId === entityId)
}

/** Reverse lookup by provider + external ID. */
export async function findByExternalId(
  provider: ExternalProvider,
  externalId: string
): Promise<ExternalRef | undefined> {
  const adapter = getStorageAdapter()
  const refs = await adapter.getCollection<ExternalRef>('externalRefs')
  return refs.find((r) => r.provider === provider && r.externalId === externalId)
}

/** Reverse lookup by external number. */
export async function findByExternalNumber(
  provider: ExternalProvider,
  entityType: ExternalRef['entityType'],
  externalNumber: number
): Promise<ExternalRef | undefined> {
  const adapter = getStorageAdapter()
  const refs = await adapter.getCollection<ExternalRef>('externalRefs')
  return refs.find(
    (r) =>
      r.provider === provider &&
      r.entityType === entityType &&
      r.externalNumber === externalNumber
  )
}

/** Delete an ExternalRef by its local ID. */
export async function deleteExternalRef(id: string): Promise<void> {
  const adapter = getStorageAdapter()
  await adapter.deleteItem('externalRefs', id)
}

```

### lib/services/facet-service.ts

```typescript
import { ProfileFacet, FacetType, FacetUpdate, UserProfile } from '@/types/profile'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'
import { getExperienceInstances, getExperienceInstanceById, getExperienceSteps, getExperienceTemplates } from './experience-service'
import { getInteractionsByInstance } from './interaction-service'
import { runFlowSafe } from '@/lib/ai/safe-flow'
import { extractFacetsFlow } from '@/lib/ai/flows/extract-facets'
import { buildFacetContext } from '@/lib/ai/context/facet-context'

export async function getFacetsForUser(userId: string): Promise<ProfileFacet[]> {
  const adapter = getStorageAdapter()
  return adapter.query<ProfileFacet>('profile_facets', { user_id: userId })
}

export async function getFacetsBySnapshot(snapshotId: string): Promise<ProfileFacet[]> {
  const adapter = getStorageAdapter()
  return adapter.query<ProfileFacet>('profile_facets', { source_snapshot_id: snapshotId })
}

export async function upsertFacet(userId: string, update: FacetUpdate): Promise<ProfileFacet> {
  const adapter = getStorageAdapter()
  
  // Try to find existing facet to update
  const existingFacets = await adapter.query<ProfileFacet>('profile_facets', { 
    user_id: userId,
    facet_type: update.facet_type,
    value: update.value
  })

  if (existingFacets.length > 0) {
    const existing = existingFacets[0]
    const updated: ProfileFacet = {
      ...existing,
      confidence: update.confidence,
      evidence: update.evidence || existing.evidence,
      source_snapshot_id: update.source_snapshot_id || existing.source_snapshot_id,
      updated_at: new Date().toISOString()
    }
    return adapter.updateItem<ProfileFacet>('profile_facets', existing.id, updated)
  }

  const newFacet: ProfileFacet = {
    id: generateId(),
    user_id: userId,
    facet_type: update.facet_type,
    value: update.value,
    confidence: update.confidence,
    evidence: update.evidence || null,
    source_snapshot_id: update.source_snapshot_id || null,
    updated_at: new Date().toISOString()
  }

  return adapter.saveItem<ProfileFacet>('profile_facets', newFacet)
}

export async function removeFacet(facetId: string): Promise<void> {
  const adapter = getStorageAdapter()
  return adapter.deleteItem('profile_facets', facetId)
}

export async function getFacetsByType(userId: string, facetType: FacetType): Promise<ProfileFacet[]> {
  const adapter = getStorageAdapter()
  return adapter.query<ProfileFacet>('profile_facets', { user_id: userId, facet_type: facetType })
}

export async function getTopFacets(userId: string, facetType: FacetType, limit: number): Promise<ProfileFacet[]> {
  const facets = await getFacetsByType(userId, facetType)
  return facets
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)
}

export async function extractFacetsFromExperience(userId: string, instanceId: string): Promise<ProfileFacet[]> {
  const interactions = await getInteractionsByInstance(instanceId)
  const instance = await getExperienceInstanceById(instanceId)

  if (!instance) return []

  const extracted: ProfileFacet[] = []

  // 1. answer_submitted -> interests
  for (const interaction of interactions) {
    if (interaction.event_type === 'answer_submitted') {
      // Questionnaire sends { answers: { id: val } }, Reflection sends { reflections: { id: val } }
      const answerMap = interaction.event_payload?.answers || interaction.event_payload?.reflections || {};
      for (const answerVal of Object.values(answerMap)) {
        const answer = answerVal as string;
        if (typeof answer === 'string') {
          const keywords = answer.split(/[,\s]+/).filter(w => w.length > 3);
          for (const kw of keywords.slice(0, 3)) {
            extracted.push(await upsertFacet(userId, {
              facet_type: 'interest',
              value: kw.toLowerCase(),
              confidence: 0.6
            }));
          }
        }
      }
    }
  }

  // 2. task_completed -> skills
  const completedTasks = interactions.filter(i => i.event_type === 'task_completed')
  // Explicitly fetch steps — don't rely on instance.steps being present
  const steps = await getExperienceSteps(instanceId)
  const stepsMap = Object.fromEntries(steps.map(s => [s.id, s]))

  for (const interaction of completedTasks) {
    if (interaction.step_id && stepsMap[interaction.step_id]) {
      const stepType = stepsMap[interaction.step_id].step_type
      extracted.push(await upsertFacet(userId, {
        facet_type: 'skill',
        value: `${stepType}-active`,
        confidence: 0.5
      }))
    }
  }

  // 3. resolution.mode -> preferred_mode
  if (instance.resolution?.mode) {
    extracted.push(await upsertFacet(userId, {
      facet_type: 'preferred_mode',
      value: instance.resolution.mode,
      confidence: 0.4
    }))
  }

  return extracted
}

export async function buildUserProfile(userId: string): Promise<UserProfile> {
  const facets = await getFacetsForUser(userId)
  const experiences = await getExperienceInstances({ userId })
  const templates = await getExperienceTemplates()
  const templateMap = new Map(templates.map(t => [t.id, t]))

  // Get user info (mocking display name if users table is not easily accessible via adapter yet)
  const adapter = getStorageAdapter()
  let displayName = 'Studio User'
  let memberSince = new Date().toISOString()
  
  try {
    const users = await adapter.query<any>('users', { id: userId })
    if (users.length > 0) {
      displayName = users[0].display_name || users[0].email || displayName
      memberSince = users[0].created_at || memberSince
    }
  } catch (e) {
    console.warn('Failed to fetch user details, using defaults')
  }

  const completedExperiences = experiences.filter(e => e.status === 'completed')
  
  // Most active class
  const classCounts: Record<string, number> = {}
  let mostActiveClass: string | null = null
  let maxCount = 0

  for (const exp of completedExperiences) {
    const template = templateMap.get(exp.template_id)
    if (template) {
      const cls = template.class
      classCounts[cls] = (classCounts[cls] || 0) + 1
      if (classCounts[cls] > maxCount) {
        maxCount = classCounts[cls]
        mostActiveClass = cls
      }
    }
  }

  // Average friction
  const frictionMap: Record<string, number> = { 'low': 1, 'medium': 2, 'high': 3 }
  const completedWithFriction = completedExperiences.filter(e => e.friction_level)
  const totalFriction = completedWithFriction.reduce((sum, e) => sum + (frictionMap[e.friction_level!] || 0), 0)
  
  const experienceCount = {
    total: experiences.length,
    completed: completedExperiences.length,
    active: experiences.filter(e => e.status === 'active').length,
    ephemeral: experiences.filter(e => e.instance_type === 'ephemeral').length,
    completionRate: experiences.length > 0 ? (completedExperiences.length / experiences.length) * 100 : 0,
    mostActiveClass,
    averageFriction: completedWithFriction.length > 0 ? totalFriction / completedWithFriction.length : 0
  }

  const topInterests = facets
    .filter(f => f.facet_type === 'interest')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map(f => f.value)

  const topSkills = facets
    .filter(f => f.facet_type === 'skill')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map(f => f.value)

  const activeGoals = facets
    .filter(f => f.facet_type === 'goal')
    .map(f => f.value)

  const preferredDepthFacet = facets
    .filter(f => f.facet_type === 'preferred_depth')
    .sort((a, b) => b.confidence - a.confidence)[0]

  const preferredModeFacet = facets
    .filter(f => f.facet_type === 'preferred_mode')
    .sort((a, b) => b.confidence - a.confidence)[0]

  return {
    userId,
    displayName,
    facets,
    topInterests,
    topSkills,
    activeGoals,
    experienceCount,
    preferredDepth: preferredDepthFacet?.value || null,
    preferredMode: preferredModeFacet?.value || null,
    memberSince
  }
}

/**
 * AI-powered facet extraction.
 * 1. Build context from interactions and experience metadata.
 * 2. Run the AI flow (Gemini) to extract semantic facets.
 * 3. Upsert extracted facets to the user's profile.
 * 4. Fall back to mechanical extraction if AI is unavailable.
 */
export async function extractFacetsWithAI(userId: string, instanceId: string, sourceSnapshotId?: string): Promise<ProfileFacet[]> {
  const context = await buildFacetContext(instanceId, userId);
  
  const result = await runFlowSafe(
    () => extractFacetsFlow(context),
    { facets: [] }
  );

  // If AI failed or returned nothing, fall back to historical mechanical behavior
  // This ensures Sprint 7 doesn't break baseline functionality.
  if (!result || !result.facets || result.facets.length === 0) {
    return extractFacetsFromExperience(userId, instanceId);
  }

  const upsertedFacets: ProfileFacet[] = [];
  
  for (const facet of result.facets) {
    // Map AI facet extraction results to our canonical types
    const upserted = await upsertFacet(userId, {
      facet_type: facet.facetType as FacetType,
      value: facet.value,
      confidence: facet.confidence,
      evidence: facet.evidence,
      source_snapshot_id: sourceSnapshotId
    });
    upsertedFacets.push(upserted);
  }

  return upsertedFacets;
}


```

### lib/services/github-factory-service.ts

```typescript
/**
 * lib/services/github-factory-service.ts
 *
 * Orchestration layer for GitHub write operations.
 * Routes call THIS service — never the adapter directly (SOP-8).
 * All persistence goes through the storage adapter (SOP-9).
 */

import { isGitHubConfigured, getRepoCoordinates, getGitHubConfig } from '@/lib/config/github'
import { getGitHubClient } from '@/lib/github/client'
import { getProjectById, updateProjectState } from '@/lib/services/projects-service'
import { createPR, getPRsForProject, updatePR } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { createExternalRef } from '@/lib/services/external-refs-service'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'
import type { Project } from '@/types/project'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function requireGitHub(): void {
  if (!isGitHubConfigured()) {
    throw new Error(
      '[github-factory] GitHub is not configured. ' +
        'Add GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, and GITHUB_WEBHOOK_SECRET to .env.local.'
    )
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a GitHub issue from a local project.
 */
export async function createIssueFromProject(
  projectId: string,
  options?: { assignAgent?: boolean }
): Promise<{ issueNumber: number; issueUrl: string }> {
  requireGitHub()

  const project = await getProjectById(projectId)
  if (!project) throw new Error(`Project not found: ${projectId}`)

  const config = getGitHubConfig()
  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  const body =
    `> Created by Mira Studio\n\n` +
    `**Summary:** ${project.summary}\n\n` +
    `**Next action:** ${project.nextAction}`

  const labels = config.labelPrefix ? [`${config.labelPrefix}mira`] : ['mira']
  const assignees = options?.assignAgent ? ['copilot-swe-agent'] : undefined

  const { data: issue } = await octokit.issues.create({
    owner,
    repo,
    title: project.name,
    body,
    labels,
    assignees,
  })

  // Update project with GitHub issue linkage
  const adapter = getStorageAdapter()
  await adapter.updateItem<Project>('projects', projectId, {
    githubIssueNumber: issue.number,
    githubIssueUrl: issue.html_url,
    githubOwner: owner,
    githubRepo: repo,
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Partial<Project>)

  // Track external ref
  await createExternalRef({
    entityType: 'project',
    entityId: projectId,
    provider: 'github',
    externalId: String(issue.number),
    externalNumber: issue.number,
    url: issue.html_url,
  })

  await createInboxEvent({
    type: 'task_created',
    title: `GitHub issue created: #${issue.number}`,
    body: `Issue "${project.name}" created at ${issue.html_url}`,
    severity: 'info',
    projectId,
    actionUrl: issue.html_url,
  })

  return { issueNumber: issue.number, issueUrl: issue.html_url }
}

/**
 * Assign Copilot coding agent to the GitHub issue linked to a project.
 */
export async function assignCopilotToProject(projectId: string): Promise<void> {
  requireGitHub()

  const project = await getProjectById(projectId)
  if (!project) throw new Error(`Project not found: ${projectId}`)
  if (!project.githubIssueNumber) {
    throw new Error(
      `Project ${projectId} has no linked GitHub issue. Run createIssueFromProject first.`
    )
  }

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  await octokit.issues.addAssignees({
    owner,
    repo,
    issue_number: project.githubIssueNumber,
    assignees: ['copilot'],
  })

  const adapter = getStorageAdapter()
  await adapter.updateItem<Project>('projects', projectId, {
    copilotAssignedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Partial<Project>)

  await createInboxEvent({
    type: 'task_created',
    title: `Copilot assigned to issue #${project.githubIssueNumber}`,
    body: `GitHub Copilot has been assigned to work on "${project.name}".`,
    severity: 'info',
    projectId,
  })
}

/**
 * Dispatch a prototype GitHub Actions workflow for a project.
 */
export async function dispatchPrototypeWorkflow(
  projectId: string,
  inputs?: Record<string, string>
): Promise<void> {
  requireGitHub()

  const project = await getProjectById(projectId)
  if (!project) throw new Error(`Project not found: ${projectId}`)

  const config = getGitHubConfig()
  const workflowId = config.workflowPrototype
  if (!workflowId) {
    throw new Error(
      'GITHUB_WORKFLOW_PROTOTYPE is not set. Add the workflow filename to .env.local.'
    )
  }

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  await octokit.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: workflowId,
    ref: config.defaultBranch,
    inputs: {
      project_id: projectId,
      project_name: project.name,
      ...inputs,
    },
  })

  const adapter = getStorageAdapter()
  await adapter.updateItem<Project>('projects', projectId, {
    githubWorkflowStatus: 'queued',
    updatedAt: new Date().toISOString(),
  } as Partial<Project>)

  await createInboxEvent({
    type: 'task_created',
    title: `Workflow dispatched: ${workflowId}`,
    body: `Prototype workflow triggered for "${project.name}".`,
    severity: 'info',
    projectId,
  })
}

/**
 * Create a GitHub PR from a project (manual path, not Copilot).
 */
export async function createPRFromProject(
  projectId: string,
  params: {
    title: string
    body: string
    head: string
    draft?: boolean
  }
): Promise<{ prNumber: number; prUrl: string }> {
  requireGitHub()

  const project = await getProjectById(projectId)
  if (!project) throw new Error(`Project not found: ${projectId}`)

  const config = getGitHubConfig()
  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  const { data: ghPR } = await octokit.pulls.create({
    owner,
    repo,
    title: params.title,
    body: params.body,
    head: params.head,
    base: config.defaultBranch,
    draft: params.draft ?? false,
  })

  const localPR = await createPR({
    projectId,
    title: params.title,
    branch: params.head,
    status: 'open',
    previewUrl: undefined,
    buildState: 'pending',
    mergeable: false,
    reviewStatus: 'pending',
    author: 'local',
  })

  await updatePR(localPR.id, { number: ghPR.number })

  await createExternalRef({
    entityType: 'pr',
    entityId: localPR.id,
    provider: 'github',
    externalId: String(ghPR.number),
    externalNumber: ghPR.number,
    url: ghPR.html_url,
  })

  const adapter = getStorageAdapter()
  await adapter.updateItem<Project>('projects', projectId, {
    copilotPrNumber: ghPR.number,
    copilotPrUrl: ghPR.html_url,
    updatedAt: new Date().toISOString(),
  } as Partial<Project>)

  await createInboxEvent({
    type: 'pr_opened',
    title: `PR #${ghPR.number} opened`,
    body: `"${params.title}" is open and awaiting review.`,
    severity: 'info',
    projectId,
    actionUrl: ghPR.html_url,
  })

  return { prNumber: ghPR.number, prUrl: ghPR.html_url }
}

/**
 * Request revisions on a PR by adding a review comment.
 */
export async function requestRevision(
  projectId: string,
  prNumber: number,
  message: string
): Promise<void> {
  requireGitHub()

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: `> ✏️ **Revision request from Mira Studio**\n\n${message}`,
  })

  const prs = await getPRsForProject(projectId)
  const pr = prs.find((p) => p.number === prNumber)
  if (pr) {
    await updatePR(pr.id, {
      reviewStatus: 'changes_requested',
      requestedChanges: message,
    })
  }

  await createInboxEvent({
    type: 'changes_requested',
    title: `Changes requested on PR #${prNumber}`,
    body: message.length > 120 ? `${message.slice(0, 120)}…` : message,
    severity: 'warning',
    projectId,
  })
}

/**
 * Merge a GitHub PR for a project.
 */
export async function mergeProjectPR(
  projectId: string,
  prNumber: number,
  mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash'
): Promise<{ sha: string; merged: boolean }> {
  requireGitHub()

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  const { data: ghPR } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  })

  if (ghPR.state !== 'open') {
    throw new Error(`PR #${prNumber} is not open (state: ${ghPR.state})`)
  }
  if (ghPR.mergeable === false) {
    throw new Error(`PR #${prNumber} is not mergeable (conflicts may exist)`)
  }

  const { data: mergeResult } = await octokit.pulls.merge({
    owner,
    repo,
    pull_number: prNumber,
    merge_method: mergeMethod,
  })

  const prs = await getPRsForProject(projectId)
  const pr = prs.find((p) => p.number === prNumber)
  if (pr) {
    await updatePR(pr.id, { status: 'merged', reviewStatus: 'merged' })
  }

  await createInboxEvent({
    type: 'merge_completed',
    title: `PR #${prNumber} merged`,
    body: `"${ghPR.title}" was merged successfully.`,
    severity: 'success',
    projectId,
  })

  return {
    sha: mergeResult.sha ?? '',
    merged: mergeResult.merged ?? false,
  }
}

```

### lib/services/github-sync-service.ts

```typescript
/**
 * lib/services/github-sync-service.ts
 *
 * Pull GitHub state INTO local records.
 * All persistence goes through the storage adapter (SOP-9).
 */

import { isGitHubConfigured, getRepoCoordinates } from '@/lib/config/github'
import { getGitHubClient } from '@/lib/github/client'
import { getProjects } from '@/lib/services/projects-service'
import { getPRsForProject, updatePR, createPR } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { createAgentRun, getAgentRun } from '@/lib/services/agent-runs-service'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

import type { PullRequest } from '@/types/pr'
import type { AgentRun } from '@/types/agent-run'
import type { Project } from '@/types/project'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function requireGitHub(): void {
  if (!isGitHubConfigured()) {
    throw new Error(
      '[github-sync] GitHub is not configured. Check .env.local and wiring.md.'
    )
  }
}

/** Find local PR by PR number across all projects. */
async function findLocalPRByNumber(
  prNumber: number
): Promise<{ pr: PullRequest; projectId: string } | null> {
  const projects = await getProjects()
  for (const project of projects) {
    const prs = await getPRsForProject(project.id)
    const match = prs.find((pr) => pr.number === prNumber)
    if (match) return { pr: match, projectId: project.id }
  }
  return null
}


// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sync a single GitHub PR into the local PR record.
 */
export async function syncPullRequest(prNumber: number): Promise<PullRequest | null> {
  requireGitHub()

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  let ghPR: Awaited<ReturnType<typeof octokit.pulls.get>>['data']
  try {
    const res = await octokit.pulls.get({ owner, repo, pull_number: prNumber })
    ghPR = res.data
  } catch (err) {
    console.error(`[github-sync] Pull request #${prNumber} not found on GitHub:`, err)
    return null
  }

  const existing = await findLocalPRByNumber(prNumber)

  const status: PullRequest['status'] =
    ghPR.merged ? 'merged' : ghPR.state === 'closed' ? 'closed' : 'open'
  const reviewStatus: PullRequest['reviewStatus'] =
    ghPR.merged ? 'merged' : 'pending'

  if (existing) {
    const updated = await updatePR(existing.pr.id, {
      title: ghPR.title,
      branch: ghPR.head.ref,
      status,
      mergeable: ghPR.mergeable ?? false,
      reviewStatus,
    })
    console.log(`[github-sync] Updated local PR ${existing.pr.id} from GitHub #${prNumber}`)
    return updated
  }

  const projects = await getProjects()
  const linkedProject = projects.find((p) => p.copilotPrNumber === prNumber)
  const projectId = linkedProject?.id ?? `unknown-${generateId()}`

  const newPR = await createPR({
    projectId,
    title: ghPR.title,
    branch: ghPR.head.ref,
    status,
    previewUrl: undefined,
    buildState: 'pending',
    mergeable: ghPR.mergeable ?? false,
    reviewStatus,
    author: ghPR.user?.login ?? 'unknown',
  })

  console.log(`[github-sync] Created local PR ${newPR.id} for GitHub #${prNumber}`)
  return newPR
}

/**
 * Sync a GitHub workflow run into the local agentRuns store.
 */
export async function syncWorkflowRun(runId: number): Promise<AgentRun | null> {
  requireGitHub()

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  let run: Awaited<ReturnType<typeof octokit.actions.getWorkflowRun>>['data']
  try {
    const res = await octokit.actions.getWorkflowRun({ owner, repo, run_id: runId })
    run = res.data
  } catch (err) {
    console.error(`[github-sync] Workflow run #${runId} not found:`, err)
    return null
  }

  const status: AgentRun['status'] =
    run.status === 'completed'
      ? run.conclusion === 'success'
        ? 'succeeded'
        : 'failed'
      : run.status === 'in_progress'
      ? 'running'
      : 'queued'

  const now = new Date().toISOString()

  // Check for existing agent run via adapter
  const adapter = getStorageAdapter()
  const agentRuns = await adapter.getCollection<AgentRun>('agentRuns')
  const existing = agentRuns.find(
    (ar) => ar.githubWorkflowRunId === String(runId)
  )

  if (existing) {
    const updated = await adapter.updateItem<AgentRun>('agentRuns', existing.id, {
      status,
      finishedAt: status === 'succeeded' || status === 'failed' ? now : undefined,
      summary: run.conclusion ?? undefined,
    } as Partial<AgentRun>)
    console.log(`[github-sync] Updated AgentRun for workflow run #${runId}`)
    return updated
  }

  const newRun = await createAgentRun({
    projectId: '',
    kind: 'prototype',
    executionMode: 'delegated' as AgentRun['executionMode'],
    triggeredBy: 'github',
    githubWorkflowRunId: String(runId),
  })

  console.log(`[github-sync] Created AgentRun for workflow run #${runId}`)
  return newRun
}

/**
 * Sync a GitHub issue's state into the local project record.
 */
export async function syncIssue(issueNumber: number): Promise<void> {
  requireGitHub()

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  let issue: Awaited<ReturnType<typeof octokit.issues.get>>['data']
  try {
    const res = await octokit.issues.get({ owner, repo, issue_number: issueNumber })
    issue = res.data
  } catch (err) {
    console.error(`[github-sync] Issue #${issueNumber} not found:`, err)
    return
  }

  const projects = await getProjects()
  const project = projects.find((p) => p.githubIssueNumber === issueNumber)

  if (!project) {
    console.log(`[github-sync] No local project linked to issue #${issueNumber}`)
    return
  }

  const before = project.githubWorkflowStatus
  const issueState = issue.state

  const adapter = getStorageAdapter()
  await adapter.updateItem<Project>('projects', project.id, {
    githubWorkflowStatus: issueState,
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Partial<Project>)

  console.log(
    `[github-sync] Issue #${issueNumber} synced. State: ${before} → ${issueState}`
  )
}

/**
 * Batch sync: pull all open PRs from GitHub for the configured repo.
 */
export async function syncAllOpenPRs(): Promise<{ synced: number; created: number }> {
  requireGitHub()

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  const { data: openPRs } = await octokit.pulls.list({
    owner,
    repo,
    state: 'open',
    per_page: 100,
  })

  let synced = 0
  let created = 0

  for (const ghPR of openPRs) {
    const existing = await findLocalPRByNumber(ghPR.number)
    if (existing) {
      await updatePR(existing.pr.id, {
        title: ghPR.title,
        branch: ghPR.head.ref,
        status: 'open',
      })
      synced++
    } else {
      const projects = await getProjects()
      const linked = projects.find((p) => p.copilotPrNumber === ghPR.number)
      await createPR({
        projectId: linked?.id ?? `unknown-${generateId()}`,
        title: ghPR.title,
        branch: ghPR.head.ref,
        status: 'open',
        previewUrl: undefined,
        buildState: 'pending',
        mergeable: false,
        reviewStatus: 'pending',
        author: ghPR.user?.login ?? 'unknown',
      })
      created++
    }
  }

  console.log(`[github-sync] Batch sync complete: ${synced} updated, ${created} created`)
  await createInboxEvent({
    type: 'pr_opened',
    title: `PR sync complete`,
    body: `${synced} PRs updated, ${created} new PRs imported from GitHub.`,
    severity: 'info',
  })

  return { synced, created }
}

```

### lib/services/goal-service.ts

```typescript
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



```

### lib/services/graph-service.ts

```typescript
import { ExperienceInstance, getExperienceInstanceById, updateExperienceInstance, getExperienceTemplates, getExperienceInstances, createExperienceInstance, getExperienceSteps, createExperienceSteps } from './experience-service';
import { ExperienceChainContext } from '@/types/graph';
import { getProgressionSuggestions, shouldEscalateResolution } from '@/lib/experience/progression-rules';
import { runFlowSafe } from '../ai/safe-flow';
import { suggestNextExperienceFlow } from '../ai/flows/suggest-next-experience';
import { buildSuggestionContext } from '../ai/context/suggestion-context';

/**
 * Walks back via previous_experience_id to find the direct parent.
 * It does NOT walk the entire chain; it just gets the immediate upstream.
 */
export async function getExperienceChain(instanceId: string): Promise<ExperienceChainContext> {
  const instance = await getExperienceInstanceById(instanceId);
  if (!instance) {
    throw new Error(`Experience instance not found: ${instanceId}`);
  }

  let previousExperience = null;
  if (instance.previous_experience_id) {
    const prev = await getExperienceInstanceById(instance.previous_experience_id);
    if (prev) {
      // Need to find the template class for the previous experience
      const templates = await getExperienceTemplates();
      const template = templates.find(t => t.id === prev.template_id);
      
      previousExperience = {
        id: prev.id,
        title: prev.title,
        status: prev.status,
        class: template?.class || 'unknown'
      };
    }
  }

  // Get suggested next titles
  const suggestedNext = [];
  if (instance.next_suggested_ids && instance.next_suggested_ids.length > 0) {
    for (const nextId of instance.next_suggested_ids) {
      const nextExp = await getExperienceInstanceById(nextId);
      if (nextExp) {
        suggestedNext.push({
          id: nextExp.id,
          title: nextExp.title,
          reason: 'Suggested next step' // Default reason
        });
      }
    }
  }

  const depth = await getChainDepth(instanceId);

  return {
    previousExperience,
    suggestedNext,
    chainDepth: depth,
    resolutionCarryForward: true // Default
  };
}

/**
 * Links two experiences together.
 * Sets previous_experience_id on the target and adds the target id to next_suggested_ids on the source.
 */
export async function linkExperiences(fromId: string, toId: string, edgeType: string): Promise<void> {
  // Edge type is currently stored implicitly by these two fields
  
  // Set upstream link on target
  await updateExperienceInstance(toId, { previous_experience_id: fromId });
  
  // Set downstream link on source
  const source = await getExperienceInstanceById(fromId);
  if (source) {
    const nextSuggestedIds = source.next_suggested_ids || [];
    if (!nextSuggestedIds.includes(toId)) {
      await updateExperienceInstance(fromId, { 
        next_suggested_ids: [...nextSuggestedIds, toId] 
      });
    }
  }
}

/**
 * Walks backwards counting the number of steps in the chain.
 */
export async function getChainDepth(instanceId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = instanceId;
  
  // Use a map to prevent infinite loops if data is corrupted
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const instance = await getExperienceInstanceById(currentId);
    if (!instance || !instance.previous_experience_id) {
      break;
    }
    depth++;
    currentId = instance.previous_experience_id;
  }
  
  return depth;
}

/**
 * Suggests next experiences based on the current instance's class and progression rules.
 */
export async function getSuggestionsForCompletion(instanceId: string): Promise<{ templateClass: string; reason: string; resolution: any }[]> {
  const instance = await getExperienceInstanceById(instanceId);
  if (!instance) return [];

  const templates = await getExperienceTemplates();
  const currentTemplate = templates.find(t => t.id === instance.template_id);
  if (!currentTemplate) return [];

  const rules = getProgressionSuggestions(currentTemplate.class);
  
  return rules.map(rule => {
    const nextDepth = shouldEscalateResolution(rule, instance.resolution.depth);
    return {
      templateClass: rule.toClass,
      reason: rule.reason,
      resolution: {
        ...instance.resolution,
        depth: nextDepth
      }
    };
  });
}

/**
 * Finds all instances of the same template for a user, sorted by created_at.
 */
export async function getLoopInstances(userId: string, templateId: string): Promise<ExperienceInstance[]> {
  const instances = await getExperienceInstances({ userId });
  return instances
    .filter(inst => inst.template_id === templateId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}


export async function getLoopCount(userId: string, templateId: string): Promise<number> {
  const instances = await getLoopInstances(userId, templateId);
  return instances.length;
}

/**
 * Creates a new iteration of a recurring experience.
 */
export async function createLoopInstance(userId: string, templateId: string, sourceInstanceId: string): Promise<ExperienceInstance> {
  const source = await getExperienceInstanceById(sourceInstanceId);
  if (!source) throw new Error(`Source instance not found: ${sourceInstanceId}`);

  const loopCount = await getLoopCount(userId, templateId);
  const iteration = loopCount + 1;
  const title = source.title.includes(' (Week ') 
    ? source.title.replace(/\(Week \d+\)$/, `(Week ${iteration})`)
    : `${source.title} (Week ${iteration})`;

  const instanceData: Omit<ExperienceInstance, 'id' | 'created_at'> = {
    user_id: userId,
    template_id: templateId,
    title,
    goal: source.goal,
    instance_type: 'persistent',
    status: 'proposed',
    resolution: source.resolution,
    reentry: {
      trigger: 'time',
      prompt: 'Weekly check-in',
      contextScope: 'focused'
    },
    previous_experience_id: sourceInstanceId,
    next_suggested_ids: [],
    friction_level: null,
    source_conversation_id: source.source_conversation_id,
    generated_by: 'system',
    published_at: null
  };

  const newInstance = await createExperienceInstance(instanceData);
  
  // Clone steps from source
  const sourceSteps = await getExperienceSteps(sourceInstanceId);
  const newSteps = sourceSteps.map(step => ({
    instance_id: newInstance.id,
    step_order: step.step_order,
    step_type: step.step_type,
    title: step.title,
    payload: step.payload,
    completion_rule: step.completion_rule
  }));

  await createExperienceSteps(newSteps);

  return newInstance;
}

/**
 * Returns loop history (sorted by date)
 */
export async function getLoopHistory(userId: string, templateId: string): Promise<ExperienceInstance[]> {
  return getLoopInstances(userId, templateId);
}

/**
 * Aggregates graph stats for the GPT state packet.
 */
export async function getGraphSummaryForGPT(userId: string): Promise<{ activeChains: number; totalCompleted: number; loopingTemplates: string[]; deepestChain: number }> {
  const allInstances = await getExperienceInstances({ userId });
  
  const completed = allInstances.filter(inst => inst.status === 'completed');
  
  // Active chains: count of instances that have no next_suggested_ids and are active/completed
  // Simple heuristic: leaf nodes in the chain
  const leafNodes = completed.filter(inst => !inst.next_suggested_ids || inst.next_suggested_ids.length === 0);
  
  // Find depth for each leaf node
  const depths = await Promise.all(leafNodes.map(inst => getChainDepth(inst.id)));
  const deepestChain = depths.length > 0 ? Math.max(...depths) : 0;

  // Find looping templates (templates with more than 1 instance)
  const templateCounts: Record<string, number> = {};
  allInstances.forEach(inst => {
    templateCounts[inst.template_id] = (templateCounts[inst.template_id] || 0) + 1;
  });
  
  const loopingTemplates = Object.keys(templateCounts).filter(tid => templateCounts[tid] > 1);

  return {
    activeChains: leafNodes.length,
    totalCompleted: completed.length,
    loopingTemplates,
    deepestChain
  };
}

/**
 * Suggestion result with AI confidence and reasoning.
 */
export interface SuggestionResult {
  templateClass: string;
  reason: string;
  resolution: any;
  confidence: number;
}

/**
 * AI-powered suggestion function that falls back to static rules.
 */
export async function getAISuggestionsForCompletion(instanceId: string, userId: string): Promise<SuggestionResult[]> {
  // Assemble context
  const context = await buildSuggestionContext(userId, instanceId);
  
  // Static fallback
  const staticSuggestions = await getSuggestionsForCompletion(instanceId);
  const fallback: SuggestionResult[] = staticSuggestions.map(s => ({
    ...s,
    confidence: 0.5
  }));

  // Run AI flow with safe wrapper
  return await runFlowSafe(
    async () => {
      const result = await suggestNextExperienceFlow(context);
      return result.suggestions.map(s => ({
        templateClass: s.templateClass,
        reason: s.reason,
        resolution: s.suggestedResolution,
        confidence: s.confidence
      }));
    },
    fallback
  );
}

/**
 * Gets suggestions for the user based on their most recent activity.
 */
export async function getSmartSuggestions(userId: string): Promise<SuggestionResult[]> {
  const allInstances = await getExperienceInstances({ userId });
  const completed = allInstances
    .filter(inst => inst.status === 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (completed.length === 0) {
    return [];
  }

  return getAISuggestionsForCompletion(completed[0].id, userId);
}

```

### lib/services/home-summary-service.ts

```typescript
import { getActiveGoal } from './goal-service';
import { getSkillDomainsForGoal, getSkillDomainsForUser } from './skill-domain-service';
import { 
  getExperienceInstances, 
  getExperienceSteps, 
  getResumeStepIndex,
  getActiveExperiences,
  getProposedExperiences
} from './experience-service';
import { getKnowledgeDomains, getKnowledgeUnits } from './knowledge-service';
import { getCurriculumOutlinesForUser } from './curriculum-outline-service';
import { getInteractionsForInstances } from './interaction-service';
import { getArenaProjects } from './projects-service';
import { getInboxEvents } from './inbox-service';
import { getIdeasByStatus } from './ideas-service';
import { DEFAULT_USER_ID, MASTERY_THRESHOLDS } from '@/lib/constants';

/**
 * lib/services/home-summary-service.ts
 *
 * Composes a single data packet for the homepage cockpit.
 * Eliminates N+1 query patterns by parallelizing top-level fetches
 * and consolidating lookups.
 */
export async function getHomeSummary(userId: string = DEFAULT_USER_ID) {
  // 1. Parallelize primary data fetches
  const [
    activeGoal,
    allInstances,
    proposedExperiences,
    activeExperiences,
    knowledgeUnits,
    knowledgeSummary,
    outlines,
    arenaProjects,
    allEvents,
    capturedIdeas
  ] = await Promise.all([
    getActiveGoal(userId),
    getExperienceInstances({ userId }),
    getProposedExperiences(userId),
    getActiveExperiences(userId),
    getKnowledgeUnits(userId),
    getKnowledgeDomains(userId),
    getCurriculumOutlinesForUser(userId),
    getArenaProjects(), // Note: Projects service doesn't yet take userId in most calls
    getInboxEvents(),
    getIdeasByStatus('captured')
  ]);

  // 2. Resolve skill domains (goal-specific if active goal exists, else user-wide)
  const skillDomains = activeGoal 
    ? await getSkillDomainsForGoal(activeGoal.id)
    : await getSkillDomainsForUser(userId);

  // 3. Resolve focus experience (priority heuristic)
  let focusExperience = null;
  let focusLastActivity: string | null = null;
  let focusNextStep = null;
  let focusTotalSteps = 0;
  let focusReason: string | undefined = undefined;

  const activeish = allInstances.filter(e => ['active', 'published', 'injected'].includes(e.status));
  
  // Optimization: Pre-fetch all needed data for heuristics
  const activeIds = activeish.map(e => e.id);
  const allInteractions = await getInteractionsForInstances(activeIds);
  const activeishSteps = await Promise.all(activeish.map(e => getExperienceSteps(e.id)));

  type Candidate = {
    exp: any;
    priority: number;
    reason: string | undefined;
    latestInteraction: string;
    nextStep: any;
    totalSteps: number;
    resumeIndex: number;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const candidates: Candidate[] = activeish.map((exp, idx) => {
    const steps = activeishSteps[idx];
    const interactions = allInteractions.filter(i => i.instance_id === exp.id);
    const latestInteraction = (interactions && interactions.length > 0)
      ? (interactions.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b).created_at as string)
      : (exp.created_at as string);

    // Calculate resume index exactly as getResumeStepIndex does
    const completions = interactions.filter(i => i.event_type === 'task_completed');
    const completedStepIds = new Set(completions.map(c => c.step_id));
    let highestOrder = -1;
    for (const step of steps) {
      if (completedStepIds.has(step.id)) {
        highestOrder = Math.max(highestOrder, step.step_order);
      }
    }
    const resumeIndex = Math.min(highestOrder + 1, steps.length - 1);
    const nextStep = steps[resumeIndex] || null;

    let priority = 4; // default recency priority
    let reason = undefined;

    // Check Heuristic 1: Scheduled today or overdue
    if (nextStep && nextStep.scheduled_date && nextStep.scheduled_date <= todayStr) {
      priority = 1;
      reason = "📅 Scheduled for today";
    }
    // Check Heuristic 3 (wait, evaluate 3 before 2, so 2 can override if applicable)
    else if (nextStep && nextStep.step_type === 'checkpoint') {
      const stepInteractions = interactions.filter(i => i.step_id === nextStep.id);
      if (stepInteractions.length > 0) {
         priority = 3;
         reason = "🔄 Retry checkpoint";
      }
    }

    // Check Heuristic 2: Closest to mastery threshold
    // Needs to override priority 3 and 4, but not 1.
    if (priority > 1 && exp.curriculum_outline_id) {
       const outline = outlines.find(o => o.id === exp.curriculum_outline_id);
       if (outline && outline.domain) {
          const domain = skillDomains.find(d => d.name === outline.domain);
          if (domain) {
             const levels = ['aware', 'beginner', 'practicing', 'proficient', 'expert'];
             let nextLevelContent = undefined;
             for (const lvl of levels) {
                if (lvl === 'undiscovered') continue;
                // @ts-ignore
                if (domain.evidenceCount < MASTERY_THRESHOLDS[lvl]) {
                   nextLevelContent = lvl;
                   break;
                }
             }
             if (nextLevelContent) {
                // @ts-ignore
                const gap = MASTERY_THRESHOLDS[nextLevelContent] - domain.evidenceCount;
                if (gap === 1) {
                   priority = 2; // Beats priority 3 & 4
                   reason = `📈 1 experience away from ${nextLevelContent}`;
                }
             }
          }
       }
    }

    return {
      exp,
      priority,
      reason,
      latestInteraction,
      nextStep,
      totalSteps: steps.length,
      resumeIndex
    };
  });

  // Sort candidates by priority (asc) then recency (desc)
  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(b.latestInteraction).getTime() - new Date(a.latestInteraction).getTime();
  });

  if (candidates.length > 0) {
    const best = candidates[0];
    focusExperience = best.exp;
    focusLastActivity = best.latestInteraction;
    focusNextStep = best.nextStep;
    focusTotalSteps = best.totalSteps;
    focusReason = best.reason;
  }

  // 4. Calculate research status
  const lastVisitThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const newKnowledgeUnitsCount = knowledgeUnits.filter(u => u.created_at > lastVisitThreshold).length;

  // 5. Calculate pending ephemerals (last 24h, injected status)
  const pendingEphemerals = allInstances.filter(e => 
    e.instance_type === 'ephemeral' && 
    e.status === 'injected' &&
    e.created_at > lastVisitThreshold
  );

  return {
    activeGoal,
    skillDomains,
    focusExperience: {
      instance: focusExperience,
      nextStep: focusNextStep,
      totalSteps: focusTotalSteps,
      lastActivityAt: focusLastActivity,
      focusReason,
    },
    proposedExperiences,
    activeExperiences,
    pendingEphemerals,
    knowledgeSummary,
    newKnowledgeUnitsCount,
    outlines: outlines.filter(o => o.status === 'active' || o.status === 'planning'),
    unhealthyProjects: arenaProjects.filter(p => p.health === 'red' || p.health === 'yellow'),
    arenaProjects,
    recentEvents: allEvents.slice(0, 3),
    capturedIdeas,
  };
}

```

### lib/services/ideas-service.ts

```typescript
import type { Idea, IdeaStatus } from '@/types/idea'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

/**
 * Normalize a DB row (snake_case from ideas) to the TS Idea shape (camelCase).
 */
function fromDB(row: Record<string, any>): Idea {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    rawPrompt: row.raw_prompt,
    gptSummary: row.gpt_summary,
    vibe: row.vibe,
    audience: row.audience,
    intent: row.intent,
    created_at: row.created_at,
    status: row.status,
  }
}

/**
 * Normalize a TS Idea (camelCase) to DB row shape (snake_case for ideas).
 */
function toDB(idea: Partial<Idea>): Record<string, any> {
  const row: Record<string, any> = {}
  
  if (idea.id) row.id = idea.id
  if (idea.userId !== undefined) row.user_id = idea.userId
  if (idea.title !== undefined) row.title = idea.title
  if (idea.rawPrompt !== undefined) row.raw_prompt = idea.rawPrompt
  if (idea.gptSummary !== undefined) row.gpt_summary = idea.gptSummary
  if (idea.vibe !== undefined) row.vibe = idea.vibe
  if (idea.audience !== undefined) row.audience = idea.audience
  if (idea.intent !== undefined) row.intent = idea.intent
  if (idea.created_at !== undefined) row.created_at = idea.created_at
  if (idea.status !== undefined) row.status = idea.status
  
  return row
}

export async function getIdeas(userId?: string): Promise<Idea[]> {
  const adapter = getStorageAdapter()
  const filters: Record<string, any> = {}
  if (userId) {
    filters.user_id = userId
  }
  const raw = await adapter.query<Record<string, any>>('ideas', filters)
  return raw.map(fromDB)
}

export async function getIdeaById(id: string): Promise<Idea | undefined> {
  const adapter = getStorageAdapter()
  const raw = await adapter.query<Record<string, any>>('ideas', { id })
  if (!raw || raw.length === 0) return undefined
  return fromDB(raw[0])
}

export async function getIdeasByStatus(status: IdeaStatus, userId?: string): Promise<Idea[]> {
  const adapter = getStorageAdapter()
  const filters: Record<string, any> = { status }
  if (userId) {
    filters.user_id = userId
  }
  const raw = await adapter.query<Record<string, any>>('ideas', filters)
  return raw.map(fromDB)
}

export async function createIdea(data: Omit<Idea, 'id' | 'created_at' | 'status'>): Promise<Idea> {
  const adapter = getStorageAdapter()
  const idea: Idea = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
    status: 'captured',
  }
  
  const dbRow = toDB(idea)
  const savedRow = await adapter.saveItem<Record<string, any>>('ideas', dbRow)
  return fromDB(savedRow)
}

export async function updateIdeaStatus(id: string, status: IdeaStatus): Promise<Idea | null> {
  const adapter = getStorageAdapter()
  try {
    const updatedRow = await adapter.updateItem<Record<string, any>>('ideas', id, { status })
    return fromDB(updatedRow)
  } catch {
    return null
  }
}


```

### lib/services/inbox-service.ts

```typescript
import type { InboxEvent, InboxEventType } from '@/types/inbox'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

/**
 * Normalize a DB row (snake_case from timeline_events) to the TS InboxEvent shape (camelCase).
 */
function fromDB(row: Record<string, any>): InboxEvent {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    timestamp: row.timestamp,
    severity: row.severity,
    read: row.read ?? false,
    // snake_case DB → camelCase TS
    projectId: row.project_id ?? row.projectId,
    actionUrl: row.action_url ?? row.actionUrl,
    githubUrl: row.github_url ?? row.githubUrl,
  }
}

/**
 * Normalize a TS InboxEvent (camelCase) to DB row shape (snake_case for timeline_events).
 */
function toDB(event: InboxEvent): Record<string, any> {
  return {
    id: event.id,
    type: event.type,
    title: event.title,
    body: event.body,
    timestamp: event.timestamp,
    severity: event.severity,
    read: event.read,
    // camelCase TS → snake_case DB
    project_id: event.projectId ?? null,
    action_url: event.actionUrl ?? null,
    github_url: event.githubUrl ?? null,
  }
}

export async function getInboxEvents(): Promise<InboxEvent[]> {
  const adapter = getStorageAdapter()
  const raw = await adapter.getCollection<Record<string, any>>('inbox')
  return raw.map(fromDB)
}

export async function createInboxEvent(data: {
  type: InboxEventType
  title: string
  body: string
  severity: InboxEvent['severity']
  projectId?: string
  actionUrl?: string
  githubUrl?: string
  timestamp?: string
  read?: boolean
}): Promise<InboxEvent> {
  const adapter = getStorageAdapter()
  const event: InboxEvent = {
    ...data,
    id: generateId(),
    timestamp: data.timestamp ?? new Date().toISOString(),
    read: data.read ?? false,
  }
  // Write as snake_case to timeline_events
  const dbRow = toDB(event)
  await adapter.saveItem<Record<string, any>>('inbox', dbRow)
  return event
}

export async function markRead(eventId: string): Promise<void> {
  const adapter = getStorageAdapter()
  await adapter.updateItem<Record<string, any>>('inbox', eventId, { read: true })
}

export async function getUnreadCount(): Promise<number> {
  const inbox = await getInboxEvents()
  return inbox.filter((e) => !e.read).length
}

export async function getEventsByFilter(filter: 'all' | 'unread' | 'errors'): Promise<InboxEvent[]> {
  const inbox = await getInboxEvents()
  switch (filter) {
    case 'unread':
      return inbox.filter((e) => !e.read)
    case 'errors':
      return inbox.filter((e) => e.severity === 'error')
    case 'all':
    default:
      return inbox
  }
}

/**
 * Convenience wrapper for creating GitHub lifecycle inbox events.
 */
export async function createGitHubInboxEvent(params: {
  type: InboxEventType
  projectId: string
  title: string
  body: string
  githubUrl?: string
  severity?: InboxEvent['severity']
}): Promise<InboxEvent> {
  return createInboxEvent({
    type: params.type,
    projectId: params.projectId,
    title: params.title,
    body: params.body,
    severity: params.severity ?? 'info',
    githubUrl: params.githubUrl,
  })
}


```

### lib/services/interaction-service.ts

```typescript
import { InteractionEvent, InteractionEventType, Artifact } from '@/types/interaction'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

export async function recordInteraction(data: { instanceId: string; stepId?: string | null; eventType: InteractionEventType; eventPayload: any }): Promise<InteractionEvent> {
  const adapter = getStorageAdapter()
  const event: InteractionEvent = {
    id: generateId(),
    instance_id: data.instanceId,
    step_id: data.stepId || null,
    event_type: data.eventType,
    event_payload: data.eventPayload,
    created_at: new Date().toISOString()
  }
  return adapter.saveItem<InteractionEvent>('interaction_events', event)
}

export async function getInteractionsByInstance(instanceId: string): Promise<InteractionEvent[]> {
  const adapter = getStorageAdapter()
  return adapter.query<InteractionEvent>('interaction_events', { instance_id: instanceId })
}

export async function getInteractionsForInstances(instanceIds: string[]): Promise<InteractionEvent[]> {
  if (!instanceIds || instanceIds.length === 0) return []
  const adapter = getStorageAdapter()
  return adapter.queryIn<InteractionEvent>('interaction_events', 'instance_id', instanceIds)
}

export async function createArtifact(data: { instanceId: string; artifactType: string; title: string; content: string; metadata: any }): Promise<Artifact> {
  const adapter = getStorageAdapter()
  const artifact: Artifact = {
    id: generateId(),
    instance_id: data.instanceId,
    artifact_type: data.artifactType,
    title: data.title,
    content: data.content,
    metadata: data.metadata || {},
  }
  return adapter.saveItem<Artifact>('artifacts', artifact)
}

export async function getArtifactsByInstance(instanceId: string): Promise<Artifact[]> {
  const adapter = getStorageAdapter()
  return adapter.query<Artifact>('artifacts', { instance_id: instanceId })
}

```

### lib/services/knowledge-service.ts

```typescript
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
    summary: idea.gptSummary,
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

### lib/services/mind-map-service.ts

```typescript
import { generateId } from '@/lib/utils';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { ThinkBoard, ThinkNode, ThinkEdge } from '@/types/mind-map';
import { MapSummary } from '@/types/synthesis';

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
    };
  }));

  return summaries;
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
import { getBoardSummaries } from './mind-map-service'

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

  // SOP-39: Sort by most recent first — getExperienceInstances returns DB insertion order
  experiences.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  
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
    latestExperiences: experiences.slice(0, 10).map(e => ({ ...e } as ExperienceInstance)),
    activeReentryPrompts: activeReentryPrompts.map(p => ({
      ...p,
      priority: p.priority // Explicitly ensure priority is carried
    })),
    frictionSignals,
    suggestedNext: experiences[0]?.next_suggested_ids || [],
    synthesisSnapshot: snapshot,
    proposedExperiences: proposedExperiences.slice(0, 5).map(e => ({ ...e } as ExperienceInstance)),
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

  // W1: Injected for Lane 2 - Mind Map summaries
  try {
    packet.activeMaps = await getBoardSummaries(userId)
  } catch (error) {
    packet.activeMaps = []
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
  // --- Sprint 17: Mind Map Station ---
  mindMap: {
    heading: 'Mind Map',
    subheading: 'Your visual thinking board.',
    emptyState: 'Create your first thinking board to start mapping.',
    actions: {
      createBoard: 'New Board',
      switchBoard: 'Switch Board',
    },
    labels: {
      activeBoard: 'Active Map',
    }
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
 * Normalize an incoming idea payload to camelCase for the TS types.
 * Accepts both camelCase (from GPT/API) and snake_case.
 */
export function normalizeIdeaPayload(data: Record<string, unknown>): Omit<Idea, 'id' | 'created_at' | 'status'> {
  return {
    userId: (data.userId || data.user_id || '') as string,
    title: data.title as string,
    rawPrompt: (data.rawPrompt || data.raw_prompt || '') as string,
    gptSummary: (data.gptSummary || data.gpt_summary || '') as string,
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
      summary: i.gptSummary,
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
  think/                 ← ThinkNode, ThinkCanvas (React Flow mind map)
  drawers/               ← ThinkNodeDrawer (node detail editor)
  layout/                ← SlideOutDrawer (global drawer system)
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
                           home-summary, mind-map services
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
  mind-map.ts            ← ThinkBoard, ThinkNode, ThinkEdge

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

## ⚠️ PROTECTED FILES — READ BEFORE MODIFYING

> **These files have been repeatedly regressed by agents.** They encode hard-won operational doctrine and runtime-verified API contracts. **Do not rewrite, simplify, or restructure them** without explicit user approval.

| File | Why it's protected | Max size |
|------|-------------------|----------|
| `gpt-instructions.md` | The Custom GPT's operating doctrine. Encodes the philosophy that Mira is an **operating environment**, not a Q&A bot. Contains the 12-step operating sequence, flat payload format, field name cheat sheets, spatial layout rules, and behavior rules. Every word was verified against runtime. | **< 8,000 chars** |
| `public/openapi.yaml` | The OpenAPI schema that the Custom GPT Action reads. Field names, enum values, and payload shapes must exactly match `gateway-router.ts` switch cases. If you add a new case to the router, add the enum value here. | — |
| `lib/gateway/discover-registry.ts` | Runtime schema documentation served by `GET /api/gpt/discover`. Examples must pass `validateStepPayload()`. Payloads must be **flat** (no nesting under `payload` key). | — |
| `lib/gateway/gateway-router.ts` | The dispatch layer. Normalizes camelCase GPT payloads → snake_case DB columns for experiences. Contains validation for required fields. Changes here must be mirrored in openapi.yaml and discover-registry. | — |

**Rules for modifying these files:**
1. **Never strip operational philosophy** from `gpt-instructions.md`. The GPT must understand that it builds operating environments, not just creates entities. (See SOP-35.)
2. **Never re-nest payloads** under a `payload` key in discover-registry or openapi.yaml. The gateway normalizes flat payloads — the schema must match.
3. **Never add a router case without updating openapi.yaml enums.** (See SOP-37.)
4. **Never update discover-registry examples without verifying against step-payload-validator.** (See SOP-32.)
5. **Always verify `gpt-instructions.md` stays under 8,000 characters** after edits. The Custom GPT has a practical instruction size limit.
6. **If you need to change field names**, update ALL FOUR files together: router → registry → openapi → instructions.

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

### SOP-34: GPT Contract Alignment [Sprint 16]
GPT instructions and discover registry MUST match TypeScript contracts. Always verify enum values against `lib/contracts/resolution-contract.ts` before updating `public/openapi.yaml` or `lib/gateway/discover-registry.ts`. Drifting enums cause GPT failure in live production.

### SOP-35: GPT Instructions Must Preserve Product Reality
**Learned from**: Sprint 16 instruction rewrite stripping away product context

- ❌ Stripping GPT instructions down to pure tool-use mechanics (e.g. "Use createEntity for X, use updateEntity for Y") without explaining what the system *is*.
- ✅ GPT instructions must explain the reality of Mira's use: it is an experience engine, a goal-driven learning/operating system with skill domains, curriculum outlines, and experiences. Ensure the GPT understands the *purpose* of the app, not just the function signatures.
- Why: When instructions are reduced to pure mechanical tool execution, the Custom GPT treats the API like a database wrapper rather than orchestrating a cohesive user experience. Context matters.

### SOP-36: React Flow event handlers — use named props, not `event.detail` hacks
**Learned from**: Sprint 18 — double-click to create node was silently broken

- ❌ `onPaneClick={(e) => { if (e.detail === 2) ... }}` (checking click count manually)
- ✅ `onDoubleClick={handler}` or `onNodeDoubleClick={handler}` (dedicated React Flow props)
- Why: React Flow's internal event handling can interfere with `event.detail` counts. The library exposes dedicated props for double-click, context menu, etc. Always use the named prop, never detect double-click imperatively.

### SOP-37: OpenAPI enum values must match gateway-router switch cases
**Learned from**: Sprint 18 — GPT couldn't discover mind map update actions

- ❌ Gateway router handles `update_map_node`, `delete_map_node`, `delete_map_edge` but OpenAPI `action` enum doesn't list them.
- ✅ Every `case` in `gateway-router.ts` `dispatchCreate` and `dispatchUpdate` must appear in the corresponding `enum` in `public/openapi.yaml`.
- Why: Custom GPT reads the OpenAPI schema to learn what actions are valid. Missing enum values = invisible capabilities. This is the inverse of SOP-34 — the schema must also match the router, not just the contracts.

### SOP-38: OpenAPI response schemas must have explicit `properties` — never bare objects
**Learned from**: Gateway Schema Fix — GPT Actions validator rejected simplified schema

- ❌ `schema: { type: object, additionalProperties: true }` (no properties listed)
- ✅ `schema: { type: object, properties: { field1: { type: string }, ... } }` (explicit properties, `additionalProperties: true` optional)
- Why: The Custom GPT Actions OpenAPI validator requires every `type: object` in a response schema to declare `properties`. A bare object with only `additionalProperties: true` triggers: `"object schema missing properties"`. This only applies to response schemas — request schemas with `additionalProperties: true` work fine because they're advisory. Always keep the full response property listings from the working schema; never simplify them away.

### SOP-39: `buildGPTStatePacket` must sort by most recent — never return oldest-first
**Learned from**: Flowlink system audit — newly created experiences invisible to GPT

- ❌ `experiences.slice(0, 5)` without sorting (returns oldest 5 from DB query)
- ✅ Sort `experiences` by `created_at` descending, THEN slice. Increase limit to 10.
- Why: `getExperienceInstances` returns records in DB insertion order. When 14 experiences exist, slicing the first 5 returns the MiraK proposals from March, hiding the Flowlink sprints created in April. The GPT sees a stale world.

### SOP-40: Goal state queries must include `intake` — not just `active`
**Learned from**: Flowlink system audit — goal invisible to GPT because `getActiveGoal` filters `status: 'active'`

- ❌ `getActiveGoal(userId)` → only returns goals with status `active`, null when all are `intake`
- ✅ If no active goal exists, fall back to the most recent `intake` goal.
- Why: Goals are created in `intake` status by the gateway. Until someone explicitly transitions them to `active`, they're invisible in the state packet, making the GPT unaware that a goal exists. The state endpoint must reflect reality, not just ideal terminal states.

### SOP-41: Gateway step creation must filter metadata out of step payload — never leak userId/type/etc.
**Learned from**: Flowlink system audit — standalone `type:"step"` creation fails with `UnrecognizedKwargsError`

- ❌ Destructuring `{ type, experienceId, step_type, title, payload, ...rest }` and passing `rest` as the step payload (leaks `userId`, `boardId`, etc. into the payload)
- ✅ Define per-step-type content key lists (`lesson: ['sections']`, `challenge: ['objectives']`, etc.) and extract ONLY those keys from `rest` into the step payload.
- Why: When GPT sends `{ type: "step", step_type: "lesson", title: "...", sections: [...], userId: "..." }`, the `rest` object picks up `userId` alongside `sections`. This pollutes the step payload and can cause DB write failures or validation errors. Content keys must be explicitly extracted per step type.

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
- **2026-03-29**: Sprint 15 completed (Chained Experiences + Spontaneity). All 7 lanes done. Fixed 500 error on synthesis endpoint (duplicate key constraint in `facet-service` upsert). Updated `storage.ts` with Sprint 10+ collections to immunize JSON fallback users against crashes. Clarified roadmap numbering going forward: Sprint 16 is definitively the Coder Pipeline (Proposal → Realization — formerly Sprint 14). Sprint 17 is GitHub Hardening.
- **2026-03-30**: Sprint 16 completed (GPT Alignment). Fixed reentry trigger enum drift (`explicit` → `manual`, added `time`). Fixed contextScope enum drift. Added `study` to resolution mode contract. Wired knowledge write + skill domain CRUD through GPT gateway. Rewrote GPT instructions with 5-mode structure from Mira's self-audit. Added SOP-34 (GPT Contract Alignment).
- **2026-03-30 (Sprint 17)**: Addressed critical persistence normalization issues (camelCase vs snake_case). Added SOP-35 (GPT Instructions Must Preserve Product Reality) meaning GPT must act as an Operating System orchestrator instead of functionally blindly creating items. Ported 'Think Tank' to Mira's 'Mind Map Station' for node-based visual orchestration.
- **2026-03-30 (Sprint 18)**: Refined Mind Map logic to cluster large batch operations and minimize UI lag. Fixed double-click node creation (SOP-36). Fixed OpenAPI enum drift for mind map actions (SOP-37). Added two-way metadata binding on node export. Added entity badge rendering on exported nodes. Updated GPT instructions with spatial layout rails and `read_map` protocol. Added mind-map components to repo map.
- **2026-03-31 (Gateway Schema Fix)**: Fixed 3 critical GPT-to-runtime mismatches. (1) Experience creation completely broken — camelCase→snake_case normalization added to `gateway-router.ts` persistent create path, `instance_type`/`status` defaults added, inline `steps` creation supported. (2) Skill domain creation failing silently — pre-flight validation for `userId`/`goalId`/`name` added with actionable error messages. (3) Goal domain auto-create isolation — per-domain try/catch so one failure doesn't break the goal create. Error reporting improved: validation errors return 400 (not 500) with field-level messages. OpenAPI v2.2.0 aligned to flat payloads. Discover registry de-nested. GPT instructions rewritten with operational doctrine (7,942 chars, under 8k limit). Added **⚠️ PROTECTED FILES** section to `AGENTS.md` — these 4 files (`gpt-instructions.md`, `openapi.yaml`, `discover-registry.ts`, `gateway-router.ts`) must not be regressed without explicit user approval.
- **2026-04-01 (Flowlink Execution Audit)**: Discovered 6 systemic issues preventing Flowlink system from operating. (1) `buildGPTStatePacket` returned oldest 5 experiences, hiding new Flowlink sprints (SOP-39). (2) `getActiveGoal` filtered for `active` only, hiding `intake` goals (SOP-40). (3) Skill domains orphaned — auto-created with phantom goal ID from a failed retry. (4) Standalone step creation leaking metadata into payloads (SOP-41). (5) Duplicate Sprint 01 shells from multiple creation attempts. (6) Board nodes at (0,0) with no nodeType. Sprint 20 created: 3 lanes — State Visibility, Data Integrity, Content Enrichment.

```

### board.md

```markdown
# Mira Studio Engine — Sprint Board

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 14 | Surface the Intelligence | TSC ✅ | ✅ Complete — 7 lanes |
| Sprint 15 | Chained Experiences + Spontaneity | TSC ✅ | ✅ Complete — 7 lanes |
| Sprint 16 | GPT Instruction Alignment + Knowledge | TSC ✅ | ✅ Complete — 4 lanes |
| Sprint 17 | Persistence Normalization + Core Mind Map | TSC ✅ | ✅ Complete — 6 lanes |
| Sprint 18 | Mind Map UX & AI Context Binding | TSC ✅ | ✅ Complete — 5 lanes |
| Sprint 19 | Node Interaction Overhaul (chrome, inline edit, content modal, context menu, keyboard) | TSC ✅ | ✅ Complete — 3 lanes |

---

## 🚀 Active Sprint: Sprint 20 — Flowlink Execution Hardening

> **Goal:** Fix the 6 issues preventing the Flowlink system from operating correctly: make the goal visible to GPT state, repair orphaned skill domains, fix experience slicing so Flowlink sprints appear, fix standalone step creation, clean up duplicate data, and deepen the 3 sprint experiences to production quality. When done, `getGPTState` should return the full Flowlink operating system and all 3 sprints should have 5+ rich steps each.

### Context: What Exists in Supabase Right Now

**Goals (2, both `intake` — invisible to `getActiveGoal`):**
- `8589478a` — "Launch AI Automation Brand…" (old, can be cleaned up)
- `7d9b8682` — "Build Flowlink into a creator-led AI workflow business" (THE goal)

**Skill Domains (5, all linked to phantom goal `3a2113da` — FK orphaned):**
- Customer Development & Workflow Discovery (`bdeb65a3`)
- Content Engine & Shorts Pipeline (`8f359545`)
- Positioning & Brand Authority (`543bde2a`)
- Offer Design & Monetization (`0bfc95f1`)
- Product Direction & Execution Rhythm (`8f87b7f7`)

**Experiences (14 total, 3 Flowlink sprints with steps):**
- `47dda878` — Sprint 01 (3 steps: lesson/challenge/checkpoint) ← THE GOOD ONE
- `73ce0372` — Sprint 02 (3 steps) ← GOOD
- `994e31b3` — Sprint 03 (3 steps) ← GOOD
- `ef6808c0` — Sprint 01 duplicate shell (no steps, linked to outline)
- `cc230c37` — Sprint 01 duplicate shell (no steps)
- Plus 9 other MiraK/GPT-proposed experiences

**Curriculum Outline:**
- `c78443f7` — "Flowlink Creator-Operator OS" (5 subtopics, planning status)

**Board:**
- `4af83b6a` — "Default Board" (72 nodes, 76 edges — all at 0,0)

```text
Dependency Graph:

Lane 1:  [W1: State slice fix] → [W2: Goal/domain in state] → [W3: Gateway goal transition] → [W4: Verification]
                                                                         │
Lane 2:  [W1: Activate goal (data)] → [W2: Re-parent domains] → [W3: Delete dupes] → [W4: Fix step creation] → [W5: Verify]
              │                                                          ↑
              └──(goal ID needed by L1 W2)───────────────────────────────┘
Lane 3:  [W1: Read existing steps] → [W2: Enrich Sprint 01] → [W3: Enrich Sprint 02] → [W4: Enrich Sprint 03] → [W5: Verify]
              │
              └──(depends on L2 W4 for standalone step creation fix)
```

NOTE: Lane 2 W1 (activate goal) should be done FIRST — Lane 1 W2 depends on it. Lane 3 can begin reading/planning immediately but needs Lane 2 W4 (step fix) to land before writing new steps.

## Sprint 20 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| GPT state endpoint | `app/api/gpt/state/route.ts` | Lane 1 |
| State packet builder | `lib/services/synthesis-service.ts` (`buildGPTStatePacket` fn) | Lane 1 |
| Gateway router (step case + goal transition) | `lib/gateway/gateway-router.ts` | Lane 2 |
| Gateway update dispatch | `lib/gateway/gateway-router.ts` (dispatchUpdate only) | Lane 2 |
| OpenAPI spec | `public/openapi.yaml` | Lane 1 |
| GPT instructions | `gpt-instructions.md` | Lane 1 |
| Experience step payloads (via API calls) | No file ownership — API-only data work | Lane 3 |

**Shared caution:** `gateway-router.ts` is touched by Lane 2 only. Lane 1 touches the state route + synthesis service. Lane 3 touches no files — it only writes data via curl/API.

---

### 🛣️ Lane 1 — State Visibility & GPT Alignment

**Focus:** Fix `getGPTState` so it returns the full Flowlink operating system — goal, skill domains, and the recent Flowlink sprint experiences — instead of the stale MiraK slice.

- ✅ **W1. Fix experience slicing in `buildGPTStatePacket`**
  - In `lib/services/synthesis-service.ts`, line 110: `experiences.slice(0, 5)` returns the **oldest 5** because `getExperienceInstances` returns in creation-date order. The Flowlink sprints (April 1) are items 12-14 — totally invisible.
  - **Fix:** Sort experiences by `created_at` descending BEFORE slicing. Increase slice to 10.
  - Also fix `proposedExperiences` on line 118 — same issue (`.slice(0, 3)` misses the sprints).
  - Change: `experiences.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())` before the slice.
  - Bump proposed limit to 5.
  - **Done**: Added descending sort by created_at before slicing, increased latestExperiences to 10 and proposed to 5 — Flowlink sprints now appear in positions 0-5.

- ✅ **W2. Surface intake goals in state endpoint**
  - In `app/api/gpt/state/route.ts`: `getActiveGoal(userId)` only returns goals with `status: 'active'`. Both Flowlink goals are `intake`.
  - **Fix:** Add a fallback: if no active goal found, query for the most recent intake goal. Import `getGoalsForUser` from goal-service. Try active first, then fall back to most recent intake.
  - Also: when building `skill_domains`, if the goal has no domains linked via `getSkillDomainsForGoal`, also try `getSkillDomainsForUser` as a broader fallback (catches the orphaned domains until Lane 2 fixes the FK).
  - **Done**: State endpoint now falls back to most recent intake goal (SOP-40) and uses user-level domain query as a second fallback for orphaned domains — goal and 5 skill domains now visible.

- ✅ **W3. Add `transition_goal` action to gateway update dispatch**
  - In `lib/gateway/gateway-router.ts` `dispatchUpdate`: Add a new case `'transition_goal'` that calls `transitionGoalStatus(payload.goalId, payload.transitionAction)`.
  - This lets GPT activate goals via the gateway: `{ "action": "transition_goal", "goalId": "...", "transitionAction": "activate" }`.
  - Import `transitionGoalStatus` from `@/lib/services/goal-service`.
  - **Done**: Added `transition_goal` case to `dispatchUpdate` with validation for goalId and transitionAction, dynamic import of transitionGoalStatus.

- ✅ **W4. Update OpenAPI + GPT instructions**
  - In `public/openapi.yaml`: Add `transition_goal` to the `action` enum in `/api/gpt/update`. Add `goalId` property description.
  - In `gpt-instructions.md`: Add `transition_goal` to the Update Reference section.
  - **Done**: Added `transition_goal` to OpenAPI action enum + goalId property, added transition_goal line to GPT instructions Update Reference (7,976 chars, under 8k limit).

- ✅ **W5. Verification**
  - Run `npx tsc --noEmit` — must pass.
  - Curl `getGPTState` and confirm: returned data includes the Flowlink goal (even if intake), skill domains (via user fallback), and the 3 Flowlink sprint experiences in `latestExperiences`.
  - **Done**: TSC clean, curl confirms goal `7d9b8682` (status active, domainCount 5), 5 skill domains, and all 3 Flowlink sprints in top 10 latestExperiences.

**Done when:** `getGPTState` returns a packet where:
- `goal` is not null and shows the Flowlink goal
- `skill_domains` has 5 entries
- `latestExperiences` includes the 3 Flowlink sprints
- GPT can call `transition_goal` to activate goals

---

### 🛣️ Lane 2 — Data Integrity & Gateway Step Fix

**Focus:** Fix orphaned skill domains, activate the Flowlink goal, clean up duplicate experiences, and repair standalone step creation.

- ✅ **W1. Activate the Flowlink goal**
  - **Done**: Activated Goal 7d9b8682-4b7c-4858-9687-19baeb6005e5. Status is now "active".
- ✅ **W2. Re-parent orphaned skill domains**
  - **Done**: Re-parented 5 orphans to goal 7d9b8682.
- ✅ **W3. Delete duplicate Sprint 01 shells**
  - **Done**: Superseded `ef6808c0`, `cc230c37`, `d3212834`, `cff3f270`, `fdd840c9`, and `eb322f2e`.
- ✅ **W4. Fix standalone step creation in gateway router**
  - **Done**: Implemented `STEP_CONTENT_KEYS` filtering logic in `dispatchCreate` to prevent metadata leakage into step payloads.
- ✅ **W5. Verification**
  - **Done**: All verify steps passed. TSC clean, goal 7d9b8682 active, all 5 domains re-parented, 6 duplicates superseded, and standalone step payload filtering confirmed (SOP-41).

**Done when:**
- Flowlink goal is `active`
- 5 skill domains have `goalId: 7d9b8682`
- Duplicate sprint shells are `superseded`
- Standalone `type:"step"` creation works with flat `sections`/`questions`/`prompts`

---

### 🛣️ Lane 3 — Sprint Content Enrichment

**Focus:** Deepen the 3 Flowlink sprints from 3 steps each to 5+ steps each, add rich content to existing steps, and ensure the experiences are executable — not just skeletons. This lane does NOT touch code files. It works entirely via API calls.

**IMPORTANT:** This lane depends on Lane 2 W4 (step fix) landing first. If standalone step creation still fails, use the workaround: create a NEW experience with inline steps that replaces the existing one, then supersede the old one.

- ✅ **W1. Read existing step payloads** - **Done**: Captured current state of 3 sprints.
- ✅ **W2. Enrich Sprint 01 — Customer Development & Workflow Discovery** - **Done**: Created new Sprint 01 experience with 5 steps (Lesson, Challenge, Reflection, Plan Builder, Checkpoint) and superseded old one (`47dda878`). New ID: `fd83913c`.
- ✅ **W3. Enrich Sprint 02 — Shorts Pipeline & Content Engine** - **Done**: Created new Sprint 02 experience with 5 steps (Lesson, Challenge, Reflection, Essay Tasks, Checkpoint) and superseded old one (`73ce0372`). New ID: `a4c6592d`.
- ✅ **W4. Enrich Sprint 03 — First Offer & Case Development** - **Done**: Created new Sprint 03 experience with 5 steps (Lesson, Challenge, Plan Builder, Reflection, Checkpoint) and superseded old one (`994e31b3`). New ID: `c3580298`.
- ✅ **W5. Verification** - **Done**: Verified 5 steps per sprint via API checks. All content follows Kolb rhythm.
**Done when:**
- Each sprint has 5+ steps
- Every step has real production-quality content in its payload
- Step types follow the Kolb rhythm (teach → practice → test → reflect → plan)

---

## 🚦 Pre-Flight Checklist
- [ ] TSC clean
- [ ] Dev server running smoothly
- [ ] `getGPTState` returns Flowlink goal, 5 skill domains, and 3+ sprint experiences
- [ ] Standalone step creation works via flat payload
- [ ] All 3 sprints have 5+ steps with real content

## 🤝 Handoff Protocol
1. Mark W items ⬜ → 🟡 → ✅ as you go.
2. Add "- **Done**: [one sentence]" after marking ✅.
3. Run `npx tsc --noEmit` before marking any lane complete (Lanes 1 & 2 only — Lane 3 is data-only).
4. **DO NOT perform visual browser checks** — parallel agents cause HMR conflicts.
5. Own only the files in Sprint 20 Ownership Zones for your lane.
6. Never push/pull from git.
7. Do not run formatters over untouched files.
8. Lane 3: If standalone step creation is still broken after Lane 2 W4, use the inline-steps-during-experience-creation workaround and supersede the old experience. Don't block.

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

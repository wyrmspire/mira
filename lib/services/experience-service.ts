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
  // 1. Create synthesis snapshot (now AI-powered via Lane 4's changes)
  const snapshot = await createSynthesisSnapshot(userId, 'experience', instanceId);
  
  // 2. Extract facets with AI (Lane 3's function)
  await extractFacetsWithAI(userId, instanceId);
  
  // 3. Update friction level
  await updateInstanceFriction(instanceId);

  return snapshot;
}

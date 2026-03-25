import { ProfileFacet, FacetType, FacetUpdate, UserProfile } from '@/types/profile'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'
import { getExperienceInstances, getExperienceInstanceById, getExperienceSteps } from './experience-service'
import { getInteractionsByInstance } from './interaction-service'

export async function getFacetsForUser(userId: string): Promise<ProfileFacet[]> {
  const adapter = getStorageAdapter()
  return adapter.query<ProfileFacet>('profile_facets', { user_id: userId })
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
      source_snapshot_id: update.source_snapshot_id || existing.source_snapshot_id,
      updated_at: new Date().toISOString()
    }
    return adapter.saveItem<ProfileFacet>('profile_facets', updated)
  }

  const newFacet: ProfileFacet = {
    id: generateId(),
    user_id: userId,
    facet_type: update.facet_type,
    value: update.value,
    confidence: update.confidence,
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
  
  // Get user info (mocking display name if users table is not easily accessible via adapter yet)
  // But SOP-9 says go through services.
  // I'll try to query users table directly via adapter as a fallback.
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

  const experienceCount = {
    total: experiences.length,
    completed: experiences.filter(e => e.status === 'completed').length,
    active: experiences.filter(e => e.status === 'active').length,
    ephemeral: experiences.filter(e => e.instance_type === 'ephemeral').length
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

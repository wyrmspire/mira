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
import { getSkillDomainsForUser } from './skill-domain-service'
import { computeSkillMastery } from '@/lib/experience/skill-mastery-engine'
import { SkillMasteryLevel } from '@/lib/constants'
import { getOperationalContext } from './agent-memory-service'

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
    synthesizeExperienceFlow,
    { instanceId: sourceId, userId }
  )

  if (aiResult && aiResult.narrative) {
    snapshot.summary = aiResult.narrative
    snapshot.key_signals = {
      ...snapshot.key_signals,
      ...(Array.isArray(aiResult.keySignals) 
        ? aiResult.keySignals.reduce((acc: any, sig: string, i: number) => ({ ...acc, [`signal_${i}`]: sig }), {})
        : {}),
      frictionAssessment: aiResult.frictionAssessment
    }
    snapshot.next_candidates = Array.isArray(aiResult.nextCandidates) ? aiResult.nextCandidates : []
  }
  
  // W2 - Compute Mastery Transitions for Lane 5
  if (sourceType === 'experience') {
    const allDomains = await getSkillDomainsForUser(userId)
    const linkedDomains = allDomains.filter(d => d.linkedExperienceIds.includes(sourceId))
    
    if (linkedDomains.length > 0) {
      const transitions: any[] = []
      const LEVELS: SkillMasteryLevel[] = ['undiscovered', 'aware', 'beginner', 'practicing', 'proficient', 'expert']
      const userInstances = await getExperienceInstances({ userId })
      
      for (const domain of linkedDomains) {
        // 'After' state is current
        const { masteryLevel: afterLevel, evidenceCount: afterEvidence } = await computeSkillMastery(domain, undefined, userInstances)
        // 'Before' state skips this experience
        const { masteryLevel: beforeLevel, evidenceCount: beforeEvidence } = await computeSkillMastery(domain, sourceId, userInstances)
        
        if (afterLevel !== beforeLevel || afterEvidence !== beforeEvidence) {
          transitions.push({
            domainId: domain.id,
            domainName: domain.name,
            before: { level: beforeLevel, evidence: beforeEvidence },
            after: { level: afterLevel, evidence: afterEvidence },
            isLevelUp: LEVELS.indexOf(afterLevel) > LEVELS.indexOf(beforeLevel)
          })
        }
      }
      
      snapshot.key_signals.masteryTransitions = transitions
    }
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
    compressGPTStateFlow,
    { rawStateJSON: JSON.stringify(packet), tokenBudget: 800 }
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

  // Sprint 24 Lane 1: Operational Context (Memories + Board Handles)
  try {
    packet.operational_context = await getOperationalContext(userId)
  } catch (error) {
    console.error('[SynthesisService] OperationalContext error:', error)
    packet.operational_context = null
  }

  return packet
}

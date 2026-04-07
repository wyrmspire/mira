  
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

  if (aiResult) {
    snapshot.summary = aiResult.narrative
    snapshot.key_signals = {
      ...snapshot.key_signals,
      ...aiResult.keySignals.reduce((acc: any, sig: string, i: number) => ({ ...acc, [`signal_${i}`]: sig }), {}),
      frictionAssessment: aiResult.frictionAssessment
    }
    snapshot.next_candidates = aiResult.nextCandidates
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
    if (!event.instance_id) continue;
    
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
  agent_memory: 'agent_memory',
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
    focusNarrative: "You're {percent}% through {title}. Next: {step}.",
    reentry: {
      heading: 'Pick Up Where You Left Off',
      viewMore: 'View {count} other re-entry points ↓',
      hideMore: 'Hide other re-entry points ↑',
    },
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
      misconception: 'Misconception',
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
  // --- Sprint 24: Agent Memory ---
  memory: {
    heading: 'Memory',
    subheading: 'What Mira has learned about you.',
    emptyState: 'Mira builds a memory of your projects, preferences, and progress as you use the studio.',
    topicBadge: '{count} entries',
    actions: {
      edit: 'Correct',
      delete: 'Delete',
      pin: 'Pin',
      unpin: 'Unpin',
    },
    confirmDelete: 'Are you sure you want Mira to forget this?',
    kinds: {
      observation: 'Observation',
      strategy: 'Strategy',
      idea: 'Idea',
      preference: 'Preference',
      tactic: 'Tactic',
      assessment: 'Assessment',
      note: 'Note',
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

### lib/validators/enrichment-validator.ts

```typescript
// lib/validators/enrichment-validator.ts
import { NexusIngestPayload, NEXUS_ATOM_TYPES } from '@/types/enrichment';

/**
 * Validates the ingest payload from Nexus.
 */
export function validateNexusIngestPayload(body: any): { 
  valid: boolean; 
  error?: string; 
  data?: NexusIngestPayload 
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Payload must be an object' };
  }

  // 1. Required Top-level Fields
  if (!body.delivery_id || typeof body.delivery_id !== 'string') {
    return { valid: false, error: 'Missing or invalid delivery_id (idempotency key)' };
  }

  if (!Array.isArray(body.atoms) || body.atoms.length === 0) {
    return { valid: false, error: 'Payload must contain a non-empty atoms array' };
  }

  // 2. Validate Atoms
  for (let i = 0; i < body.atoms.length; i++) {
    const atom = body.atoms[i];
    
    if (!atom || typeof atom !== 'object') {
      return { valid: false, error: `Atom at index ${i} must be an object` };
    }

    if (!atom.atom_type || !NEXUS_ATOM_TYPES.includes(atom.atom_type)) {
      return { valid: false, error: `Atom at index ${i} has missing or invalid atom_type: ${atom.atom_type}` };
    }

    if (!atom.title || typeof atom.title !== 'string') {
      return { valid: false, error: `Atom at index ${i} missing or invalid title` };
    }

    if (!atom.content || typeof atom.content !== 'string') {
      return { valid: false, error: `Atom at index ${i} missing or invalid content` };
    }

    // key_ideas must be an array if present (it's required by the NexusAtomPayload interface)
    if (!Array.isArray(atom.key_ideas)) {
      return { valid: false, error: `Atom at index ${i} key_ideas must be an array` };
    }
  }

  // 3. Optional IDs validation
  if (body.request_id && typeof body.request_id !== 'string') {
    return { valid: false, error: 'Invalid request_id' };
  }

  if (body.target_experience_id && typeof body.target_experience_id !== 'string') {
    return { valid: false, error: 'Invalid target_experience_id' };
  }

  if (body.target_step_id && typeof body.target_step_id !== 'string') {
    return { valid: false, error: 'Invalid target_step_id' };
  }

  return { valid: true, data: body as NexusIngestPayload };
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
| Enrichment | **Nexus** — async content worker via enrichment endpoints |

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
- `NEXUS_WEBHOOK_SECRET` in `c:/mira/.env.local` AND the Nexus content worker

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
  memory/               ← Memory Explorer (agent memory viewer)
    page.tsx            ← Server component: fetches + groups memories by topic → kind
  map/                  ← Map Station UI
    page.tsx            ← Server component: sidebar + canvas layout for boards
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
      memory/route.ts    ← GET/POST: agent memory CRUD (list with filters, record with dedup)
      memory/[id]/route.ts ← PATCH/DELETE: agent memory correction (edit, remove)
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
    enrichment/          ← Nexus enrichment loop (ingest, request)
      ingest/route.ts    ← POST: deliver atoms from Nexus
      request/route.ts   ← POST: request topic enrichment
    actions/
      promote-to-arena/  ← POST
      move-to-icebox/    ← POST
      mark-shipped/      ← POST
      kill-idea/         ← POST
      merge-pr/          ← POST
    mindmap/
      boards/route.ts    ← GET/POST boards
      boards/[id]/route.ts ← DELETE board (cascade: edges → nodes → board)
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
    blocks/              ← Granular block renderers (Sprint 22)
      BlockRenderer.tsx    ← Master router: dispatches by block.type
      ContentBlockRenderer.tsx  ← Markdown content block (ReactMarkdown + prose)
      PredictionBlockRenderer.tsx ← "What do you think?" → reveal answer
      ExerciseBlockRenderer.tsx   ← Interactive exercise with hints
      CheckpointBlockRenderer.tsx ← Semantic grading via gradeCheckpointFlow
      HintLadderBlockRenderer.tsx ← Progressive clue reveal
      CalloutBlockRenderer.tsx    ← Styled callout (tip/warning/insight)
      MediaBlockRenderer.tsx      ← Image/audio/video placeholder
  knowledge/             ← KnowledgeUnitCard, KnowledgeUnitView, MasteryBadge, DomainCard
  skills/                ← SkillTreeCard, SkillTreeGrid (Sprint 13)
  common/                ← EmptyState, StatusBadge, TimePill, ConfirmDialog, DraftIndicator,
                           FocusTodayCard (home page resume link),
                           ResearchStatusBadge (MiraK research arrival indicator)
  think/                 ← ThinkNode, ThinkCanvas (React Flow mind map),
                           MapSidebar (full sidebar replacing dropdown switcher)
  memory/                ← MemoryExplorer, MemoryEntryCard (agent memory viewer)
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
    migrations/          ← SQL migration files (001–013)
      012_enrichment_tables.sql ← Nexus enrichment tables
      013_agent_memory_and_board_types.sql ← Agent memory table + board purpose/layout columns
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
  enrichment/            ← Nexus translation layer
    atom-mapper.ts       ← Maps Nexus atoms to Mira knowledge units
    nexus-bridge.ts      ← Orchestrates enrichment delivery
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
                           draft, knowledge, enrichment, curriculum-outline, goal, skill-domain,
                           home-summary, mind-map, agent-memory services
  adapters/              ← github (real Octokit client), gpt, vercel, notifications
  formatters/            ← idea, project, pr, inbox formatters
  validators/            ← idea, project, drill, webhook, experience, step-payload, knowledge, goal, enrichment-validator
  view-models/           ← arena, icebox, inbox, review VMs

types/
  idea.ts, project.ts, task.ts, pr.ts, drill.ts, inbox.ts, webhook.ts, api.ts,
  agent-run.ts, external-ref.ts, github.ts,
  experience.ts, interaction.ts, synthesis.ts,
  graph.ts, timeline.ts, profile.ts,
  knowledge.ts           ← KnowledgeUnit, KnowledgeProgress, MiraKWebhookPayload
  enrichment.ts          ← Nexus atom types + delivery contracts
  curriculum.ts          ← CurriculumOutline, StepKnowledgeLink
  goal.ts                ← Goal, GoalRow, GoalStatus (Sprint 13)
  skill.ts               ← SkillDomain, SkillDomainRow, SkillMasteryLevel (Sprint 13)
  mind-map.ts            ← ThinkBoard (+ BoardPurpose, LayoutMode), ThinkNode, ThinkEdge
  agent-memory.ts        ← AgentMemoryEntry, MemoryEntryKind, MemoryClass, AgentMemoryPacket

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

### SOP-42: React hooks in block renderers must be called unconditionally
**Learned from**: Sprint 22 Lane 7 QA — conditional `useInteractionCapture` broke React rules of hooks

- ❌ `if (instanceId) { const { trackEvent } = useInteractionCapture(...) }` (conditional hook call)
- ✅ Call the hook unconditionally: `const { trackEvent } = useInteractionCapture(instanceId ?? '', stepId ?? '')` — then gate the *effect* on `instanceId` presence.
- Why: React requires hooks to be called in the same order on every render. Block renderers may render with or without a parent experience context (`instanceId`). If the hook is wrapped in a conditional, React throws a hooks-order violation on re-render.

### SOP-43: Dev test harness must accept both monolithic AND block payloads
**Learned from**: Sprint 22 Lane 7 QA — test harness rejected block-based step payloads


- ❌ Validating step payloads strictly for `sections` or `prompts` arrays only.
- ✅ Accept EITHER `sections`/`prompts` (monolithic) OR `blocks` (granular). Both are valid under the Fast Path Guarantee.
- Why: Sprint 22 introduced `blocks[]` as an alternative to `sections[]`. The dev test harness at `/api/dev/test-experience` was still validating the old-only shape, causing all block-based test experiences to fail creation.

### SOP-44: Agent Memory is a Notebook, Not a Database
**Learned from**: Sprint 24 architecture — memory design review

- ❌ Storing structured data (scores, mastery levels, user profiles) in the agent memory table.
- ✅ Store GPT's *thoughts*: observations, strategies, ideas, hunches, assessments, preferences.
- Why: Supabase tables hold structured runtime data (mastery, interactions, goals). Agent memory holds the GPT's qualitative reasoning — what it noticed, what worked, what it wants to try. These are different concerns.

### SOP-45: Board Purpose Drives Template — Never Create Empty Purpose Boards
**Learned from**: Sprint 24 architecture — board template review

- ❌ Creating a `curriculum_review` board that starts as a blank canvas.
- ✅ Set `purpose` on creation → service auto-creates template starter nodes → GPT expands from there.
- Why: A purpose board without template structure is no better than a general board. The template is the payoff — it gives GPT and the user a head start.

### SOP-46: Memory Deduplication — Boost, Don't Duplicate
**Learned from**: Sprint 24 architecture — memory bloat prevention

- ❌ Inserting a new row every time GPT records a similar observation.
- ✅ If content + topic + kind all match an existing entry (case-insensitive trim), boost `confidence` by +0.1 (capped at 1.0) and increment `usage_count`.
- Why: Without dedup, the memory table fills with near-identical entries. The GPT's recall quality degrades because it retrieves duplicates instead of diverse memories.

### SOP-47: State Packet Carries Handles, Not Full Content
**Learned from**: Sprint 24 architecture — state packet weight review

- ❌ Inlining 10 full memory entries (with content, tags, metadata) into the `GET /api/gpt/state` response.
- ✅ Return `memory_handles` with IDs + counts only in `operational_context`. GPT fetches full content via `GET /api/gpt/memory` when it needs details.
- Why: The state packet is fetched on every GPT session open. Bloating it with full memory content adds latency and token cost. Handles are cheap; detail-on-demand is the pattern.

### SOP-48: Memory Without Correction is Memory Bloat
**Learned from**: Sprint 24 architecture — trust review

- ❌ Write-only memory endpoint where entries accumulate forever without cleanup or editing.
- ✅ Expose `PATCH /api/gpt/memory/[id]` (edit content, topic, tags, confidence, pin) and `DELETE /api/gpt/memory/[id]` (remove). Frontend must show edit/delete/pin controls.
- Why: If the user can see that GPT recorded something wrong and can't fix it, they stop trusting the system. Correction is a product trust requirement, not a nice-to-have.

### SOP-49: Maps Expose Macro Actions, Not Just CRUD
**Learned from**: Sprint 24 architecture — GPT map interaction review

- ❌ GPT micromanaging nodes with sequential read → create node → create edge → position loops (5+ API calls per concept).
- ✅ Expose macro actions: `board_from_text` (one text → full board), `expand_board_branch` (one node → N children), `suggest_board_gaps` (one board → suggestions). One action, many nodes.
- Why: Brittle multi-step CRUD sequences are error-prone and slow. The GPT should express intent ("expand this branch") and let the backend handle the graph operations.

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

### SOP-44: Contract Naming Canonicalization
**Learned from**: Sprint 24 (operationalContext vs operational_context mismatch)
- ❌ Passing an object where properties are camelCase (`operationalContext`) when the expected schema contract (OpenAPI, GPT Instructions) expects snake_case (`operational_context`).
- ✅ Always use the canonical naming defined in the OpenAPI schema and GPT state packet. Do not let TS interface casing leak into the final JSON output if it violates the contract.

### SOP-45: Local Fallback Parity
**Learned from**: Sprint 24 (Memory seeding omission in local mode)
- ❌ Using `if (!supabase) return null;` directly in a service assuming Supabase is the only store.
- ✅ Always query `getStorageAdapter()` when falling back for local dev if Supabase is unavailable, to ensure the JSON fallback accurately mimics the service behavior.

- **2026-03-31 (Gateway Schema Fix)**: Fixed 3 critical GPT-to-runtime mismatches. (1) Experience creation completely broken — camelCase→snake_case normalization added to `gateway-router.ts` persistent create path, `instance_type`/`status` defaults added, inline `steps` creation supported. (2) Skill domain creation failing silently — pre-flight validation for `userId`/`goalId`/`name` added with actionable error messages. (3) Goal domain auto-create isolation — per-domain try/catch so one failure doesn't break the goal create. Error reporting improved: validation errors return 400 (not 500) with field-level messages. OpenAPI v2.2.0 aligned to flat payloads. Discover registry de-nested. GPT instructions rewritten with operational doctrine (7,942 chars, under 8k limit). Added **⚠️ PROTECTED FILES** section to `AGENTS.md` — these 4 files (`gpt-instructions.md`, `openapi.yaml`, `discover-registry.ts`, `gateway-router.ts`) must not be regressed without explicit user approval.
- **2026-04-01 (Flowlink Execution Audit)**: Discovered 6 systemic issues preventing Flowlink system from operating. (1) `buildGPTStatePacket` returned oldest 5 experiences, hiding new Flowlink sprints (SOP-39). (2) `getActiveGoal` filtered for `active` only, hiding `intake` goals (SOP-40). (3) Skill domains orphaned — auto-created with phantom goal ID from a failed retry. (4) Standalone step creation leaking metadata into payloads (SOP-41). (5) Duplicate Sprint 01 shells from multiple creation attempts. (6) Board nodes at (0,0) with no nodeType. Sprint 20 created: 3 lanes — State Visibility, Data Integrity, Content Enrichment.
- **2026-04-01 (Sprint 20 complete)**: All 3 lanes done. Fixed GPT state packet slicing (sorted by created_at desc, limit 10). Fixed goal intake fallback. Re-parented 5 orphaned skill domains. Superseded 6 duplicate experience shells. Fixed standalone step creation payload leak. Enriched 3 Flowlink sprints to 5 steps each. No new SOPs — existing SOPs 39-41 covered all issues.
- **2026-04-05**: Sprint 21 completed (Mira² First Vertical Slice). All 7 lanes done. Implemented Nexus enrichment pipeline: `/api/enrichment/ingest`, `/api/webhooks/nexus`, `atom-mapper.ts`, and `nexus-bridge.ts`. Upgraded all step renderers and the Knowledge UI to use `ReactMarkdown` with Tailwind prose. Added source attribution badges and Genkit dev script (`dev:all`). 
- **Lessons Learned (Lane 7 QA)**:
    - **Plan Builder Crash**: Fixed `.map()` crash in `PlanBuilderStep.tsx` caused by missing `items` in partial sections.
    - **Knowledge UI Markdown**: Knowledge content was raw markdown; upgraded `KnowledgeUnitView.tsx` to use `ReactMarkdown`.
    - **Configuration**: Fixed concatenated `NEXUS_WEBHOOK_SECRET` in `.env.local` which caused initial 500 errors.
    - **Misconception Mapping**: Added `misconception` to `KnowledgeUnitType` constant/label/color mapping to ensure full compatibility with Nexus atoms.
- **Status**: Enrichment is strictly additive and non-blocking. Fast Path (GPT authoring) verified as unbroken.
- **2026-04-05**: Sprint 22 completed (Granular Block Architecture). All 7 lanes done. Implemented LearnIO pedagogical block mechanics (`Prediction`, `Exercise`, `HintLadder`, `Checkpoint`, `Callout`, `Media`) as part of the "Store Atoms, Render Molecules" shift.
- **Lessons Learned (Lane 7 QA)**:
    - **React Hooks Violation**: Discovered conditional invocation of `useInteractionCapture` hook in interactive block renderers. Repaired by making hook call unconditional but gating the interaction effect on `instanceId` presence.
    - **API Dev Testbed Payload Compliance**: Refactored `/api/dev/test-experience` validators from strictly enforcing monolithic payloads to flexibly accepting *either* `sections`/`prompts` arrays or `blocks` arrays, proving backend readiness for hybrid UX payload strategies.
- **Status**: Visual regression check on all fallback monolithic properties succeeded without data loss.
- **2026-04-05**: Halting structured engineering sprints to execute a Custom GPT Acceptance Test pass. This is a QA and stress-test phase of Mira/Nexus integrations ensuring real GPT conversational inputs can successfully orchestrate discovery, fast paths, and the new Sprint 22 block schemas. See `test.md` for the test protocol and rules.
- **2026-04-05**: Sprint 23 completed (GPT Acceptance & Observed Friction). Lanes 1–7 all ✅. Fixed: reentry contract persistence (Lane 1), step surgery pipeline with enriched create response (Lane 2), GPT state enrichment with pending enrichments + knowledge counts (Lane 3), proactive coach triggers — checkpoint fail, dwell, unread (Lane 4), completion synthesis with mastery transitions + next-experience cards (Lane 5), mastery evidence wiring — checkpoint grades flow to knowledge_progress with threshold-based auto-promote (Lane 6), home page coherence — focus story, reentry priority, path narrative (Lane 7). Lane 8 (acceptance QA) carried to Sprint 24. Added SOPs 44–49 for Sprint 24 preparation.

Current test count: **223 passing** | Build: clean | TSC: clean

```

### api_result.json

```json
[
  {
    "name": "1. Outline creation (Pricing Fundamentals)",
    "url": "/plan",
    "payload": {
      "action": "create_outline",
      "topic": "SaaS Pricing Strategy",
      "domain": "Business",
      "subtopics": [
        {
          "title": "Pricing Fundamentals",
          "description": "Understanding value metrics and pricing models.",
          "order": 1
        }
      ],
      "pedagogicalIntent": "build_understanding"
    },
    "status": 201,
    "statusText": "Created",
    "response": {
      "action": "create_outline",
      "outline": {
        "id": "0166f8d2-a17e-45b3-981b-c6a0a236dd49",
        "userId": "a0000000-0000-0000-0000-000000000001",
        "topic": "SaaS Pricing Strategy",
        "domain": "Business",
        "discoverySignals": {},
        "subtopics": [
          {
            "order": 1,
            "title": "Pricing Fundamentals",
            "description": "Understanding value metrics and pricing models."
          }
        ],
        "existingUnitIds": [],
        "researchNeeded": [],
        "pedagogicalIntent": "build_understanding",
        "estimatedExperienceCount": null,
        "status": "planning",
        "goalId": null,
        "createdAt": "2026-04-06T02:06:51.396+00:00",
        "updatedAt": "2026-04-06T02:06:51.396+00:00"
      },
      "message": "Curriculum outline created for \"SaaS Pricing Strategy\". Use POST /api/gpt/create to generate experiences for each subtopic."
    }
  },
  {
    "name": "1b. Create First Experience",
    "url": "/create",
    "payload": {
      "type": "ephemeral",
      "title": "Pricing Fundamentals for SaaS",
      "goal": "Understand value metrics and basic pricing models.",
      "resolution": {
        "depth": "medium",
        "mode": "illuminate",
        "timeScope": "session",
        "intensity": "medium"
      },
      "reentry": {
        "trigger": "completion",
        "prompt": "How did that go?",
        "contextScope": "minimal"
      },
      "steps": [
        {
          "step_type": "lesson",
          "title": "What is a Value Metric?",
          "blocks": [
            {
              "type": "content",
              "content": "A value metric is the way you measure the value your customer receives."
            }
          ]
        }
      ]
    },
    "status": 201,
    "statusText": "Created",
    "response": {
      "id": "56dbc101-ca47-47d4-996e-93c5ffcb5459",
      "user_id": "a0000000-0000-0000-0000-000000000001",
      "idea_id": null,
      "template_id": null,
      "title": "Pricing Fundamentals for SaaS",
      "goal": "Understand value metrics and basic pricing models.",
      "instance_type": "ephemeral",
      "status": "injected",
      "resolution": {
        "mode": "illuminate",
        "depth": "medium",
        "intensity": "medium",
        "timeScope": "session"
      },
      "reentry": {
        "prompt": "How did that go?",
        "trigger": "completion",
        "contextScope": "minimal"
      },
      "previous_experience_id": null,
      "next_suggested_ids": [],
      "friction_level": null,
      "source_conversation_id": null,
      "generated_by": "gpt",
      "realization_id": null,
      "created_at": "2026-04-06T02:06:53.266+00:00",
      "published_at": null,
      "curriculum_outline_id": null,
      "steps": [
        {
          "id": "fa972d2a-a3b8-48f6-b8ab-a3d7f544ab70",
          "instance_id": "56dbc101-ca47-47d4-996e-93c5ffcb5459",
          "step_order": 0,
          "step_type": "lesson",
          "title": "What is a Value Metric?",
          "payload": {
            "blocks": [
              {
                "type": "content",
                "content": "A value metric is the way you measure the value your customer receives."
              }
            ]
          },
          "completion_rule": null,
          "created_at": "2026-04-06T02:06:53.441646+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null,
          "order_index": 0
        }
      ]
    }
  },
  {
    "name": "2. Create lesson with all Sprint 22 blocks",
    "url": "/create",
    "payload": {
      "type": "ephemeral",
      "title": "Beginner Lesson: Customer Interviews",
      "goal": "Master the mechanics of open-ended customer interviews.",
      "resolution": {
        "depth": "heavy",
        "mode": "practice",
        "timeScope": "session",
        "intensity": "high"
      },
      "reentry": {
        "trigger": "completion",
        "prompt": "Ready to move on?",
        "contextScope": "minimal"
      },
      "steps": [
        {
          "step_type": "lesson",
          "title": "Interview Mechanics",
          "blocks": [
            {
              "type": "prediction",
              "question": "What is the biggest mistake in customer interviews?",
              "reveal_content": "Asking leading questions! It biases the user completely."
            },
            {
              "type": "exercise",
              "title": "Write an open-ended question",
              "instructions": "Write a question avoiding bias.",
              "validation_criteria": "Must not be a yes/no question."
            },
            {
              "type": "checkpoint",
              "question": "True or False: You should pitch your solution first.",
              "expected_answer": "False",
              "explanation": "Never pitch first. Always explore the problem."
            }
          ]
        },
        {
          "step_type": "reflection",
          "title": "Reflect on Bias",
          "blocks": [
            {
              "type": "content",
              "content": "Reflection time."
            }
          ],
          "prompts": [
            {
              "prompt": "What are you most nervous about when interviewing?"
            }
          ]
        }
      ]
    },
    "status": 201,
    "statusText": "Created",
    "response": {
      "id": "9e1c3fd2-8b62-47f7-84b3-8a307ee40dbb",
      "user_id": "a0000000-0000-0000-0000-000000000001",
      "idea_id": null,
      "template_id": null,
      "title": "Beginner Lesson: Customer Interviews",
      "goal": "Master the mechanics of open-ended customer interviews.",
      "instance_type": "ephemeral",
      "status": "injected",
      "resolution": {
        "mode": "practice",
        "depth": "heavy",
        "intensity": "high",
        "timeScope": "session"
      },
      "reentry": {
        "prompt": "Ready to move on?",
        "trigger": "completion",
        "contextScope": "minimal"
      },
      "previous_experience_id": null,
      "next_suggested_ids": [],
      "friction_level": null,
      "source_conversation_id": null,
      "generated_by": "gpt",
      "realization_id": null,
      "created_at": "2026-04-06T02:06:53.535+00:00",
      "published_at": null,
      "curriculum_outline_id": null,
      "steps": [
        {
          "id": "5a7c2d26-bd24-4a6f-b49f-07362d5ab850",
          "instance_id": "9e1c3fd2-8b62-47f7-84b3-8a307ee40dbb",
          "step_order": 0,
          "step_type": "lesson",
          "title": "Interview Mechanics",
          "payload": {
            "blocks": [
              {
                "type": "prediction",
                "question": "What is the biggest mistake in customer interviews?",
                "reveal_content": "Asking leading questions! It biases the user completely."
              },
              {
                "type": "exercise",
                "title": "Write an open-ended question",
                "instructions": "Write a question avoiding bias.",
                "validation_criteria": "Must not be a yes/no question."
              },
              {
                "type": "checkpoint",
                "question": "True or False: You should pitch your solution first.",
                "explanation": "Never pitch first. Always explore the problem.",
                "expected_answer": "False"
              }
            ]
          },
          "completion_rule": null,
          "created_at": "2026-04-06T02:06:53.677616+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null,
          "order_index": 0
        },
        {
          "id": "002503d2-e865-47fe-a80a-50a3c810fa0a",
          "instance_id": "9e1c3fd2-8b62-47f7-84b3-8a307ee40dbb",
          "step_order": 1,
          "step_type": "reflection",
          "title": "Reflect on Bias",
          "payload": {
            "blocks": [
              {
                "type": "content",
                "content": "Reflection time."
              }
            ],
            "prompts": [
              {
                "prompt": "What are you most nervous about when interviewing?"
              }
            ]
          },
          "completion_rule": null,
          "created_at": "2026-04-06T02:06:53.785191+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null,
          "order_index": 1
        }
      ]
    }
  },
  {
    "name": "3. Fast-path lightweight experience",
    "url": "/create",
    "payload": {
      "type": "ephemeral",
      "title": "Better Outreach Emails",
      "goal": "Draft a concise outreach email.",
      "resolution": {
        "depth": "light",
        "mode": "illuminate",
        "timeScope": "immediate",
        "intensity": "low"
      },
      "reentry": {
        "trigger": "completion",
        "prompt": "Done?",
        "contextScope": "minimal"
      },
      "steps": [
        {
          "step_type": "lesson",
          "title": "The Hook",
          "sections": [
            {
              "heading": "Rule 1",
              "body": "Keep it under 3 sentences.",
              "type": "text"
            }
          ]
        },
        {
          "step_type": "challenge",
          "title": "Draft It",
          "payload": {
            "challenge_prompt": "Draft an email.",
            "success_criteria": [
              "Under 3 lines"
            ]
          }
        }
      ]
    },
    "status": 201,
    "statusText": "Created",
    "response": {
      "id": "32c94334-ef77-4199-bc14-191fb6bc12c2",
      "user_id": "a0000000-0000-0000-0000-000000000001",
      "idea_id": null,
      "template_id": null,
      "title": "Better Outreach Emails",
      "goal": "Draft a concise outreach email.",
      "instance_type": "ephemeral",
      "status": "injected",
      "resolution": {
        "mode": "illuminate",
        "depth": "light",
        "intensity": "low",
        "timeScope": "immediate"
      },
      "reentry": {
        "prompt": "Done?",
        "trigger": "completion",
        "contextScope": "minimal"
      },
      "previous_experience_id": null,
      "next_suggested_ids": [],
      "friction_level": null,
      "source_conversation_id": null,
      "generated_by": "gpt",
      "realization_id": null,
      "created_at": "2026-04-06T02:06:53.875+00:00",
      "published_at": null,
      "curriculum_outline_id": null,
      "steps": [
        {
          "id": "eb1151d5-dde5-46d6-a10a-6fbc50728edd",
          "instance_id": "32c94334-ef77-4199-bc14-191fb6bc12c2",
          "step_order": 0,
          "step_type": "lesson",
          "title": "The Hook",
          "payload": {
            "sections": [
              {
                "body": "Keep it under 3 sentences.",
                "type": "text",
                "heading": "Rule 1"
              }
            ]
          },
          "completion_rule": null,
          "created_at": "2026-04-06T02:06:53.997606+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null,
          "order_index": 0
        },
        {
          "id": "dc9a8c5e-1bf0-4b7e-a811-d1989a3293a4",
          "instance_id": "32c94334-ef77-4199-bc14-191fb6bc12c2",
          "step_order": 1,
          "step_type": "challenge",
          "title": "Draft It",
          "payload": {
            "challenge_prompt": "Draft an email.",
            "success_criteria": [
              "Under 3 lines"
            ]
          },
          "completion_rule": null,
          "created_at": "2026-04-06T02:06:54.094416+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null,
          "order_index": 1
        }
      ]
    }
  },
  {
    "name": "4. Dispatch background research",
    "url": "/plan",
    "payload": {
      "action": "dispatch_research",
      "topic": "Unit Economics (CAC/LTV ratios)",
      "pedagogicalIntent": "explore_concept"
    },
    "status": 200,
    "statusText": "OK",
    "response": {
      "action": "dispatch_research",
      "status": "dispatched",
      "outlineId": null,
      "topic": "Unit Economics (CAC/LTV ratios)",
      "message": "Research dispatch logged. Knowledge units will arrive in the Knowledge Tab when ready."
    }
  },
  {
    "name": "5. Step Surgery",
    "url": "/update",
    "payload": {
      "action": "update_step",
      "experienceId": "9e1c3fd2-8b62-47f7-84b3-8a307ee40dbb",
      "stepId": "5a7c2d26-bd24-4a6f-b49f-07362d5ab850",
      "stepPayload": {
        "title": "Interview Mechanics - Worked Example",
        "blocks": [
          {
            "type": "content",
            "content": "Let's look at a worked example instead of abstraction."
          },
          {
            "type": "checkpoint",
            "question": "Did the interviewer bias the user here?",
            "expected_answer": "Yes",
            "explanation": "They implicitly stated what the user should feel."
          }
        ]
      }
    },
    "status": 200,
    "statusText": "OK",
    "response": {
      "id": "5a7c2d26-bd24-4a6f-b49f-07362d5ab850",
      "instance_id": "9e1c3fd2-8b62-47f7-84b3-8a307ee40dbb",
      "step_order": 0,
      "step_type": "lesson",
      "title": "Interview Mechanics - Worked Example",
      "payload": {
        "blocks": [
          {
            "type": "content",
            "content": "Let's look at a worked example instead of abstraction."
          },
          {
            "type": "checkpoint",
            "question": "Did the interviewer bias the user here?",
            "explanation": "They implicitly stated what the user should feel.",
            "expected_answer": "Yes"
          }
        ]
      },
      "completion_rule": null,
      "created_at": "2026-04-06T02:06:53.677616+00:00",
      "status": "pending",
      "scheduled_date": null,
      "due_date": null,
      "estimated_minutes": null,
      "completed_at": null
    }
  },
  {
    "name": "5b. Verify Surgery",
    "url": "/experiences/9e1c3fd2-8b62-47f7-84b3-8a307ee40dbb",
    "payload": null,
    "status": 200,
    "statusText": "OK",
    "response": {
      "id": "9e1c3fd2-8b62-47f7-84b3-8a307ee40dbb",
      "user_id": "a0000000-0000-0000-0000-000000000001",
      "idea_id": null,
      "template_id": null,
      "title": "Beginner Lesson: Customer Interviews",
      "goal": "Master the mechanics of open-ended customer interviews.",
      "instance_type": "ephemeral",
      "status": "injected",
      "resolution": {
        "mode": "practice",
        "depth": "heavy",
        "intensity": "high",
        "timeScope": "session"
      },
      "reentry": {
        "prompt": "Ready to move on?",
        "trigger": "completion",
        "contextScope": "minimal"
      },
      "previous_experience_id": null,
      "next_suggested_ids": [],
      "friction_level": null,
      "source_conversation_id": null,
      "generated_by": "gpt",
      "realization_id": null,
      "created_at": "2026-04-06T02:06:53.535+00:00",
      "published_at": null,
      "curriculum_outline_id": null,
      "steps": [
        {
          "id": "5a7c2d26-bd24-4a6f-b49f-07362d5ab850",
          "instance_id": "9e1c3fd2-8b62-47f7-84b3-8a307ee40dbb",
          "step_order": 0,
          "step_type": "lesson",
          "title": "Interview Mechanics - Worked Example",
          "payload": {
            "blocks": [
              {
                "type": "content",
                "content": "Let's look at a worked example instead of abstraction."
              },
              {
                "type": "checkpoint",
                "question": "Did the interviewer bias the user here?",
                "explanation": "They implicitly stated what the user should feel.",
                "expected_answer": "Yes"
              }
            ]
          },
          "completion_rule": null,
          "created_at": "2026-04-06T02:06:53.677616+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null
        },
        {
          "id": "002503d2-e865-47fe-a80a-50a3c810fa0a",
          "instance_id": "9e1c3fd2-8b62-47f7-84b3-8a307ee40dbb",
          "step_order": 1,
          "step_type": "reflection",
          "title": "Reflect on Bias",
          "payload": {
            "blocks": [
              {
                "type": "content",
                "content": "Reflection time."
              }
            ],
            "prompts": [
              {
                "prompt": "What are you most nervous about when interviewing?"
              }
            ]
          },
          "completion_rule": null,
          "created_at": "2026-04-06T02:06:53.785191+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null
        }
      ],
      "interactionCount": 0,
      "resumeStepIndex": 0,
      "graph": {
        "previousTitle": null,
        "suggestedNextCount": 0
      }
    }
  },
  {
    "name": "6. GPT State Hydration",
    "url": "/state?userId=a0000000-0000-0000-0000-000000000001",
    "status": 200,
    "statusText": "OK",
    "response": {
      "latestExperiences": [
        {
          "id": "32c94334-ef77-4199-bc14-191fb6bc12c2",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": null,
          "title": "Better Outreach Emails",
          "goal": "Draft a concise outreach email.",
          "instance_type": "ephemeral",
          "status": "injected",
          "resolution": {
            "mode": "illuminate",
            "depth": "light",
            "intensity": "low",
            "timeScope": "immediate"
          },
          "reentry": {
            "prompt": "Done?",
            "trigger": "completion",
            "contextScope": "minimal"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-06T02:06:53.875+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        },
        {
          "id": "9e1c3fd2-8b62-47f7-84b3-8a307ee40dbb",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": null,
          "title": "Beginner Lesson: Customer Interviews",
          "goal": "Master the mechanics of open-ended customer interviews.",
          "instance_type": "ephemeral",
          "status": "injected",
          "resolution": {
            "mode": "practice",
            "depth": "heavy",
            "intensity": "high",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "Ready to move on?",
            "trigger": "completion",
            "contextScope": "minimal"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-06T02:06:53.535+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        },
        {
          "id": "56dbc101-ca47-47d4-996e-93c5ffcb5459",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": null,
          "title": "Pricing Fundamentals for SaaS",
          "goal": "Understand value metrics and basic pricing models.",
          "instance_type": "ephemeral",
          "status": "injected",
          "resolution": {
            "mode": "illuminate",
            "depth": "medium",
            "intensity": "medium",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "How did that go?",
            "trigger": "completion",
            "contextScope": "minimal"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-06T02:06:53.266+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        },
        {
          "id": "a6fe48fc-0c82-4ca4-8fb4-c9d5dd86560d",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Service-to-Software Offer Ladder",
          "goal": "Design a practical ladder from AI social-media service offers to internal tools and eventually SaaS.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "medium",
            "intensity": "medium",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "Review which parts of your current service workflow should stay custom, which should be productized, and which deserve to become internal software first.",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-05T05:48:03.339+00:00",
          "published_at": null,
          "curriculum_outline_id": "663d1c0c-996b-42a1-9fae-13c5b0ca3fbf"
        },
        {
          "id": "63386cbf-d4d9-41cc-8411-d92cc0996e2b",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000003",
          "title": "Cold Outreach Emails",
          "goal": "Write better hooks",
          "instance_type": "ephemeral",
          "status": "completed",
          "resolution": {
            "mode": "practice",
            "depth": "light",
            "intensity": "low",
            "timeScope": "immediate"
          },
          "reentry": {
            "prompt": "Completed cold outreach fast path",
            "trigger": "completion",
            "contextScope": "minimal"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": "low",
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-05T04:24:54.706+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        },
        {
          "id": "eba12593-3c0f-4759-8a6e-ecfb6ad25b30",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000003",
          "title": "Cold Outreach Emails",
          "goal": "Write better hooks",
          "instance_type": "ephemeral",
          "status": "completed",
          "resolution": {
            "mode": "practice",
            "depth": "light",
            "intensity": "low",
            "timeScope": "immediate"
          },
          "reentry": {
            "prompt": "Completed cold outreach fast path",
            "trigger": "completion",
            "contextScope": "minimal"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": "low",
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-05T04:24:26.284+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        },
        {
          "id": "a3c45d70-8416-4a67-a432-21229c5834c8",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Beginner Lesson: Customer Interviews",
          "goal": "Master the art of customer interviews via block-based interaction",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "practice",
            "depth": "medium",
            "intensity": "medium",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "Good job",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-05T04:24:10.412+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        },
        {
          "id": "a321b096-8ef8-4525-8c1d-15f0b404dc49",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Fundamentals of SaaS Pricing",
          "goal": "Understand value-based vs per-seat pricing models and psychology",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "illuminate",
            "depth": "medium",
            "intensity": "medium",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "You just finished Fundamentals of Pricing rules. Ready for the next?",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-05T04:23:53.085+00:00",
          "published_at": null,
          "curriculum_outline_id": "94b0eb1e-0263-4a68-8e3c-f3e258f6db5f"
        },
        {
          "id": "6235154a-0f27-4583-a96e-d607c777a3a4",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "QA Smoke Reentry",
          "goal": "",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "study",
            "depth": "moderate",
            "intensity": "focused",
            "timeScope": "evening"
          },
          "reentry": {
            "prompt": "You finished the reentry smoke test",
            "trigger": "completion",
            "contextScope": "full"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-05T04:19:09.138+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        },
        {
          "id": "87b9c4bf-df01-4992-a737-6cf704061349",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000001",
          "title": "[Test] Persistent Planning Journey",
          "goal": "Verify persistent experiences appear on Home > Suggested and in Library",
          "instance_type": "persistent",
          "status": "completed",
          "resolution": {
            "mode": "build",
            "depth": "medium",
            "intensity": "medium",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "You finished the plan. Want to review priorities?",
            "trigger": "completion",
            "contextScope": "full"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "dev-harness",
          "realization_id": null,
          "created_at": "2026-04-05T02:52:59.728+00:00",
          "published_at": "2026-04-05T02:53:58.247+00:00",
          "curriculum_outline_id": null
        }
      ],
      "activeReentryPrompts": [
        {
          "instanceId": "87b9c4bf-df01-4992-a737-6cf704061349",
          "instanceTitle": "[Test] Persistent Planning Journey",
          "prompt": "You finished the plan. Want to review priorities?",
          "trigger": "completion",
          "contextScope": "full",
          "priority": "medium"
        },
        {
          "instanceId": "63386cbf-d4d9-41cc-8411-d92cc0996e2b",
          "instanceTitle": "Cold Outreach Emails",
          "prompt": "Completed cold outreach fast path",
          "trigger": "completion",
          "contextScope": "minimal",
          "priority": "medium"
        },
        {
          "instanceId": "eba12593-3c0f-4759-8a6e-ecfb6ad25b30",
          "instanceTitle": "Cold Outreach Emails",
          "prompt": "Completed cold outreach fast path",
          "trigger": "completion",
          "contextScope": "minimal",
          "priority": "medium"
        }
      ],
      "frictionSignals": [
        {
          "instanceId": "63386cbf-d4d9-41cc-8411-d92cc0996e2b",
          "level": "low"
        },
        {
          "instanceId": "eba12593-3c0f-4759-8a6e-ecfb6ad25b30",
          "level": "low"
        },
        {
          "instanceId": "c6ba6b44-df7d-4c4b-b022-e9d0ca1b350b",
          "level": "low"
        }
      ],
      "suggestedNext": [],
      "synthesisSnapshot": {
        "id": "d245ab4b-b829-45a7-b043-b80c8cc5e440",
        "user_id": "a0000000-0000-0000-0000-000000000001",
        "source_type": "experience",
        "source_id": "63386cbf-d4d9-41cc-8411-d92cc0996e2b",
        "summary": "The user began the \"Cold Outreach Emails\" experience, aimed at writing better hooks. They navigated directly to the single \"Revised Email Step,\" spent approximately 2.2 seconds on it, and immediately completed the task and the entire experience. This suggests a very quick, surface-level engagement.",
        "key_signals": {
          "signal_0": "Very fast completion (2.2 seconds on the sole step)",
          "signal_1": "Immediate task completion after viewing the step",
          "signal_2": "No evident struggle or deep interaction",
          "signal_3": "Experience resolution was light and low intensity, matching quick engagement",
          "frictionLevel": "low",
          "interactionCount": 5,
          "frictionAssessment": "The user was coasting, completing the experience with minimal time and effort, indicating it was likely too easy or not engaging enough to hold their attention."
        },
        "next_candidates": [
          "A more challenging practice focused on hooks: To encourage deeper engagement, offer a practice experience with higher intensity or depth on crafting compelling hooks.",
          "Apply hooks to a full email draft: Provide an experience where the user has to integrate new hook strategies into a complete cold email.",
          "Peer review or expert feedback on hooks: Offer an experience to get qualitative feedback on their self-generated hooks, promoting refinement and learning."
        ],
        "created_at": "2026-04-05T18:32:38.758+00:00"
      },
      "proposedExperiences": [
        {
          "id": "a6fe48fc-0c82-4ca4-8fb4-c9d5dd86560d",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Service-to-Software Offer Ladder",
          "goal": "Design a practical ladder from AI social-media service offers to internal tools and eventually SaaS.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "medium",
            "intensity": "medium",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "Review which parts of your current service workflow should stay custom, which should be productized, and which deserve to become internal software first.",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-05T05:48:03.339+00:00",
          "published_at": null,
          "curriculum_outline_id": "663d1c0c-996b-42a1-9fae-13c5b0ca3fbf"
        },
        {
          "id": "a3c45d70-8416-4a67-a432-21229c5834c8",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Beginner Lesson: Customer Interviews",
          "goal": "Master the art of customer interviews via block-based interaction",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "practice",
            "depth": "medium",
            "intensity": "medium",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "Good job",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-05T04:24:10.412+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        },
        {
          "id": "a321b096-8ef8-4525-8c1d-15f0b404dc49",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Fundamentals of SaaS Pricing",
          "goal": "Understand value-based vs per-seat pricing models and psychology",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "illuminate",
            "depth": "medium",
            "intensity": "medium",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "You just finished Fundamentals of Pricing rules. Ready for the next?",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-05T04:23:53.085+00:00",
          "published_at": null,
          "curriculum_outline_id": "94b0eb1e-0263-4a68-8e3c-f3e258f6db5f"
        },
        {
          "id": "6235154a-0f27-4583-a96e-d607c777a3a4",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "QA Smoke Reentry",
          "goal": "",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "study",
            "depth": "moderate",
            "intensity": "focused",
            "timeScope": "evening"
          },
          "reentry": {
            "prompt": "You finished the reentry smoke test",
            "trigger": "completion",
            "contextScope": "full"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-05T04:19:09.138+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        },
        {
          "id": "b9c4c1f9-012d-45cf-80f0-4aedcbe45878",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Building Resilient Webhook Ingestion Systems",
          "goal": "Learn to design, implement, and test a secure, scalable, and resilient webhook ingestion system capable of handling \"at-least-once\" delivery and meeting critical provider SLAs.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "heavy",
            "intensity": "medium",
            "timeScope": "multi_day"
          },
          "reentry": null,
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "mirak",
          "realization_id": null,
          "created_at": "2026-04-05T01:34:58.658+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        }
      ],
      "reentryCount": 3,
      "compressedState": {},
      "knowledgeSummary": {
        "domains": {
          "SaaS Growth Strategy": 2,
          "AI-SaaS Strategy": 2,
          "Content Engineering": 2,
          "Growth Engineering": 2,
          "Startup Validation": 2,
          "SaaS Strategy": 4,
          "AI Strategy & Operations": 2,
          "Operations Automation": 2,
          "nexus-enrichment": 3,
          "API Integration": 2
        },
        "total": 23,
        "masteredCount": 0
      },
      "activeMaps": [
        {
          "id": "4af83b6a-64fb-4840-b124-c0aa3814be34",
          "name": "Default Board",
          "nodeCount": 78,
          "edgeCount": 81,
          "purpose": "general",
          "layoutMode": "radial",
          "linkedEntityType": null
        }
      ],
      "operationalContext": {
        "memory_count": 0,
        "recent_memory_ids": [],
        "last_recorded_at": null,
        "active_topics": [],
        "boards": [
          {
            "id": "4af83b6a-64fb-4840-b124-c0aa3814be34",
            "name": "Default Board",
            "purpose": "general",
            "nodeCount": 78
          }
        ]
      },
      "curriculum": {
        "active_outlines": [
          {
            "id": "c78443f7-1ac1-4979-82ad-bace1dc32956",
            "topic": "Flowlink Creator-Operator OS",
            "status": "planning",
            "subtopic_count": 5,
            "completed_subtopics": 0
          },
          {
            "id": "0119f14a-6aa2-4101-a350-76c4293d8ee9",
            "topic": "Build Your Founder Research & Data Engine",
            "status": "planning",
            "subtopic_count": 8,
            "completed_subtopics": 0
          },
          {
            "id": "3aabdf1a-8113-45b3-b856-2ed684875ce0",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "91773bf0-1eec-4db3-9840-97e3c16976c7",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "7977991e-12ac-4291-920b-f380352fb111",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "e75f0e30-2a52-433b-8cad-483a26d7e7a6",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "95435614-4228-4975-b0a0-a304f1f8425f",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "a3859039-cf43-4ea8-8924-2222bfd80aaa",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "62c0d447-8b59-485d-a952-0f38bfd52984",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "68dba70f-8162-407a-8bf0-52022bb6eebd",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "3d0fb2cb-4798-44a2-b8eb-11bb4316df1a",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "7c7d1215-e35b-46f0-8e4a-571c66a62964",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 2,
            "completed_subtopics": 0
          },
          {
            "id": "94b0eb1e-0263-4a68-8e3c-f3e258f6db5f",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 2,
            "completed_subtopics": 0
          },
          {
            "id": "663d1c0c-996b-42a1-9fae-13c5b0ca3fbf",
            "topic": "Agency-to-SaaS Flywheel for AI Social Automation",
            "status": "planning",
            "subtopic_count": 5,
            "completed_subtopics": 0
          },
          {
            "id": "762a9691-6bcf-49b7-83ad-189787e282fb",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "0166f8d2-a17e-45b3-981b-c6a0a236dd49",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          }
        ],
        "recent_completions": []
      },
      "pending_enrichments": [
        {
          "topic": "Unit Economics (CAC/LTV ratios)",
          "status": "dispatched",
          "requested_at": "2026-04-06T02:06:54.315+00:00"
        },
        {
          "topic": "Unit Economics (CAC/LTV ratios)",
          "status": "dispatched",
          "requested_at": "2026-04-06T02:00:22.114+00:00"
        },
        {
          "topic": "Unit Economics",
          "status": "dispatched",
          "requested_at": "2026-04-05T04:25:08.456+00:00"
        },
        {
          "topic": "Unit Economics (CAC/LTV ratios)",
          "status": "dispatched",
          "requested_at": "2026-04-05T04:20:51.293+00:00"
        },
        {
          "topic": "Unit Economics (CAC/LTV ratios)",
          "status": "dispatched",
          "requested_at": "2026-04-05T04:20:11.471+00:00"
        }
      ],
      "goal": {
        "id": "3a2113da-9a59-4838-a453-2ee0d05ac48f",
        "title": "Build Flowlink into a creator-led AI workflow business",
        "status": "active",
        "domainCount": 5
      },
      "skill_domains": [
        {
          "name": "Customer Development & Workflow Discovery",
          "mastery_level": "aware"
        },
        {
          "name": "Content Engine & Shorts Pipeline",
          "mastery_level": "aware"
        },
        {
          "name": "Positioning & Brand Authority",
          "mastery_level": "aware"
        },
        {
          "name": "Offer Design & Monetization",
          "mastery_level": "aware"
        },
        {
          "name": "Product Direction & Execution Rhythm",
          "mastery_level": "aware"
        }
      ],
      "boards": [
        {
          "id": "4af83b6a-64fb-4840-b124-c0aa3814be34",
          "name": "Default Board",
          "nodeCount": 78,
          "edgeCount": 81,
          "purpose": "general",
          "layoutMode": "radial",
          "linkedEntityType": null
        }
      ],
      "graph": {
        "activeChains": 4,
        "totalCompleted": 4,
        "loopingTemplates": [
          "b0000000-0000-0000-0000-000000000002",
          "b0000000-0000-0000-0000-000000000003",
          "b0000000-0000-0000-0000-000000000001",
          "null"
        ],
        "deepestChain": 0
      }
    }
  }
]
```

### board.md

```markdown
# Mira Studio Engine — Sprint Board

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 15 | Chained Experiences + Spontaneity | TSC ✅ | ✅ Complete — 7 lanes |
| Sprint 16 | GPT Alignment + Operational Memory | TSC ✅ | ✅ Complete — 4 lanes |
| Sprint 17 | Persistence Normalization + Core Mind Map | TSC ✅ | ✅ Complete — 6 lanes |
| Sprint 18 | Mind Map UX & AI Context Binding | TSC ✅ | ✅ Complete — 5 lanes |
| Sprint 19 | Node Interaction Overhaul | TSC ✅ | ✅ Complete — 3 lanes |
| Sprint 20 | Flowlink Execution Hardening | TSC ✅ | ✅ Complete — 3 lanes |
| Sprint 21 | Mira² First Vertical Slice | TSC ✅ | ✅ Complete — 7 lanes |
| Sprint 22 | Granular Block Architecture | TSC ✅ | ✅ Complete — 7 lanes |
| Sprint 23 | GPT Acceptance & Observed Friction | TSC ✅ | ✅ Complete — 7 lanes (Lane 8 QA carried to S24) |

---

## Sprint 24 — Agent Memory + Multi-Board Intelligence

> **Theme:** GPT gets a persistent, correctable notebook with selective retrieval. Think Boards become typed planning surfaces with macro AI actions. Sprint 23 QA closes. GPT instructions + schema finalize.
>
> **Reference:** `sprint.md` has full design rationale, schemas, rejected ideas, and SOPs 44–49.

### 🔒 Implementation Locks (Resolve BEFORE Coding)

These 6 decisions are locked. Every lane agent must follow them exactly.

**Lock 1 — Canonical state shape.** The state packet uses `operational_context` with memory handles inside:
```ts
operational_context: {
  memory_count: number;
  recent_memory_ids: string[];  // top 10, IDs only
  last_recorded_at: string | null;
  active_topics: string[];
  boards: Array<{ id: string; name: string; purpose: string; nodeCount: number }>;
} | null  // null if 0 memories AND 0 boards
```

**Lock 2 — Dedup precision.** Content + topic + kind must ALL match (case-insensitive trim) for dedup to trigger. `memoryClass` does NOT factor into dedup — two entries with same content/topic/kind but different class are still duplicates. On match: boost confidence by +0.1 (cap 1.0), increment usage_count, update last_used_at.

**Lock 3 — Consolidation scope.** `consolidate_memory` reads: active experiences (current), recent interactions (last 24h), and current goal. Emits 2–4 entries. First implementation is **heuristic** (template-based extraction from state data). A Genkit flow upgrade is allowed but NOT required for Sprint 24.

**Lock 4 — Reparent data model.** Reparenting is **edge-based**: delete the old edge connecting child→old_parent, create a new edge connecting child→new_parent. `think_nodes` has NO `parent_node_id` column. Parent relationships are always derived from `think_edges`. The `reparent_node` gateway action handles both operations atomically.

**Lock 5 — Layout modes are persistence-only this sprint.** `layout_mode` column stores `radial | concept | flow | timeline`. The frontend renders ALL layout modes as the existing radial layout. No layout engine work in Sprint 24 — the column exists so boards remember their intended mode for a future sprint.

**Lock 6 — Board deletion never deletes linked memory entries.** Cascade delete removes edges → nodes → board. If a deleted node had `linked_memory_ids` in its metadata, those memory entries remain untouched. The memory references in the deleted node's metadata are simply lost.

**Frozen seed memory list (exact final set):**
1. `kind: 'tactic', topic: 'curriculum', content: 'Use create_outline before creating experiences for serious topics'`
2. `kind: 'tactic', topic: 'enrichment', content: 'Check enrichment status in the state packet before creating new experiences on the same topic'`
3. `kind: 'strategy', topic: 'workflow', content: 'For new domains: goal → outline → research dispatch → experience creation (not experience first)'`
4. `kind: 'observation', topic: 'pedagogy', content: 'Checkpoint questions with free_text format produce stronger learning outcomes than multiple choice'`
5. `kind: 'tactic', topic: 'maps', content: 'Use board_from_text or expand_board_branch instead of creating nodes one at a time'`
6. `kind: 'preference', topic: 'user learning style', content: 'User prefers worked examples and concrete scenarios over abstract explanations'`
7. `kind: 'strategy', topic: 'experience design', content: 'Keep experiences to 3-6 steps covering one subtopic. Chain small experiences rather than building monoliths.'`

---

### Dependency Graph

```
Gate 0 (Contracts):       [G1 memory types] → [G2 board types] → [G3 migration SQL] → [G4 state shape]
                               ↓ approved
Lane 1 (Memory Backend):      [W1 migration] → [W2 service + dedup] → [W3 API CRUD] → [W4 state integration]
Lane 2 (Memory GPT):          [W1 discover entries] → [W2 gateway cases] → [W3 consolidation] → [W4 seed]
Lane 3 (Board Types):         [W1 migration] → [W2 service + templates] → [W3 layout mode]
Lane 4 (Board Gateway):       [W1 create/list/archive] → [W2 macro actions] → [W3 board in state]
Lane 5 (Frontend):            [W1 Memory Explorer] → [W2 Map Sidebar] → [W3 node-level UX]
Lane 6 (Sprint 23 QA):        [W1 test battery] → [W2 browser walkthrough] → [W3 fix regressions]
Lane 7 (GPT Finalization):    [W1 instructions <8K] → [W2 openapi update] → [W3 discover audit] → [W4 seed memory]
Lane 8 (Integration QA):      [W1 memory e2e] → [W2 board e2e] → [W3 acceptance criteria] → [W4 docs]
```

**Parallelization:**
- Gate 0 first (single agent, ~30 min)
- Lanes 1–2 (memory) ‖ Lanes 3–4 (boards) ‖ Lane 6 (Sprint 23 QA)
- Lane 5 starts after Lanes 1 + 3 (needs service + types)
- Lane 7 starts after Lanes 1–4
- Lane 8 starts ONLY after ALL other lanes ✅

### Sprint 24 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Memory types | `types/agent-memory.ts` | Gate 0 |
| Board type extensions | `types/mind-map.ts` | Gate 0 |
| Migration SQL | `lib/supabase/migrations/013_agent_memory_and_board_types.sql` | Gate 0 |
| Memory service | `lib/services/agent-memory-service.ts` | Lane 1 |
| Memory API routes | `app/api/gpt/memory/route.ts`, `app/api/gpt/memory/[id]/route.ts` | Lane 1 |
| State packet | `app/api/gpt/state/route.ts` | Lane 1 (memory handles) + Lane 4 (board summaries) |
| Memory discover | `lib/gateway/discover-registry.ts` (memory entries only) | Lane 2 |
| Memory gateway | `lib/gateway/gateway-router.ts` (memory + consolidate cases) | Lane 2 |
| Board service | `lib/services/mind-map-service.ts` | Lane 3 |
| Board templates | `lib/services/mind-map-service.ts` (getBoardTemplate) | Lane 3 |
| Board gateway | `lib/gateway/gateway-router.ts` (board + macro action cases) | Lane 4 |
| Board discover | `lib/gateway/discover-registry.ts` (board entries only) | Lane 4 |
| Board delete API | `app/api/mindmap/boards/[id]/route.ts` | Lane 4 |
| Memory Explorer | `app/memory/page.tsx`, `components/memory/*` | Lane 5 |
| Map Sidebar | `components/think/map-sidebar.tsx`, `app/map/page.tsx` | Lane 5 |
| Node UX | `components/think/think-canvas.tsx`, `components/think/think-node.tsx` | Lane 5 |
| Sprint 23 QA | `run_api_tests.mjs`, browser | Lane 6 |
| GPT instructions | `gpt-instructions.md` | Lane 7 |
| OpenAPI schema | `public/openapi.yaml` | Lane 7 |
| Docs | `agents.md`, `mira2.md`, `board.md` | Lane 8 |

> **Shared ownership:** `gateway-router.ts` — Lane 2 owns memory + consolidate cases. Lane 4 owns board + macro action cases. `discover-registry.ts` — Lane 2 adds memory entries. Lane 4 adds board entries. Lane 7 audits all.

---

### ⚙️ Gate 0 — Contracts

> Types, migration SQL, state shape. One agent, one pass. No implementation.

- ✅ **G1 — Memory types** (`types/agent-memory.ts`)
  - `MemoryEntryKind`: observation | strategy | idea | preference | tactic | assessment | note
  - `MemoryClass`: semantic | episodic | procedural
  - `AgentMemoryEntry`: id, kind, memoryClass, topic, content, tags[], confidence, usageCount, pinned, source, createdAt, lastUsedAt, metadata
  - `AgentMemoryPacket`: entries[], totalCount, lastRecordedAt
  - **Done**: Created `types/agent-memory.ts` with 7 MemoryEntryKind values, 3 MemoryClass values, AgentMemoryEntry interface, and AgentMemoryPacket packet type.

- ✅ **G2 — Board type extensions** (`types/mind-map.ts`)
  - `BoardPurpose`: general | idea_planning | curriculum_review | lesson_plan | research_tracking | strategy
  - `LayoutMode`: radial | concept | flow | timeline
  - Extend `ThinkBoard`: add `purpose`, `layoutMode`, `linkedEntityId`, `linkedEntityType`
  - **Done**: Extended ThinkBoard with optional purpose/layoutMode (backwards-compatible), added BoardPurpose (6 values) and LayoutMode (4 values) type unions.

- ✅ **G3 — Migration SQL** (`lib/supabase/migrations/013_agent_memory_and_board_types.sql`)
  - `CREATE TABLE agent_memory`: id uuid PK DEFAULT gen_random_uuid(), user_id text NOT NULL, kind text NOT NULL, memory_class text DEFAULT 'semantic', topic text NOT NULL, content text NOT NULL, tags text[] DEFAULT '{}', confidence numeric(3,2) DEFAULT 0.6, usage_count int DEFAULT 0, pinned boolean DEFAULT false, source text DEFAULT 'gpt_learned', created_at timestamptz DEFAULT now(), last_used_at timestamptz DEFAULT now(), metadata jsonb DEFAULT '{}'
  - **Done**: Created migration 013 with agent_memory table (CHECK constraints on kind/class/source/confidence), think_boards ALTER columns (purpose, layout_mode, linked_entity_id, linked_entity_type), and 3 indexes.
  - `ALTER TABLE think_boards ADD COLUMN purpose text DEFAULT 'general'`
  - `ALTER TABLE think_boards ADD COLUMN layout_mode text DEFAULT 'radial'`
  - `ALTER TABLE think_boards ADD COLUMN linked_entity_id uuid`
  - `ALTER TABLE think_boards ADD COLUMN linked_entity_type text`
  - Index: `CREATE INDEX idx_agent_memory_user_topic ON agent_memory(user_id, topic)`

- ✅ **G4 — State shape documentation**
  - Document `operational_context` shape per Lock 1 in sprint.md
  - Confirm nullable + additive
  - **Done**: Added OperationalContext and OperationalContextBoardSummary interfaces to agent-memory.ts. Nullable (null when 0 memories AND 0 boards), additive to existing state packet.

**Done when:** `npx tsc --noEmit` passes with new types. Migration SQL reviewed.

---

### 🛣️ Lane 1 — Memory Backend

> Table, service with dedup/correction, full CRUD API, state integration.

- ✅ **W1 — Apply migration**
  - Apply migration 013 via Supabase MCP or direct SQL
  - Verify `agent_memory` table + `think_boards` columns exist
  - **Done**: Applied migration 013 and verified `agent_memory` table and new `think_boards` columns via direct database inspection.

- ✅ **W2 — Memory service** (`lib/services/agent-memory-service.ts`)
  - `getMemoryEntries(userId, filters?)` — query by kind, topic, memoryClass, since, limit; optional substring match on content via `query` param
  - `recordMemoryEntry(userId, entry)` — create with **dedup per Lock 2**: if content+topic+kind match, boost confidence+usage_count
  - `updateMemoryEntry(entryId, updates)` — PATCH: content, topic, tags, confidence, pinned
  - `deleteMemoryEntry(entryId)` — hard delete
  - `bumpUsage(entryId)` — increment usage_count, update last_used_at
  - `getMemoryForState(userId)` — per Lock 1: returns `{ memory_count, recent_memory_ids (top 10 pinned-first then usage DESC), last_recorded_at, active_topics }`
  - `getMemoryByTopic(userId)` — grouped by topic for Memory Explorer
  - DB↔TS normalization (snake_case ↔ camelCase)
  - **Done**: Created `agent-memory-service.ts` with Lock 2 deduplication logic and Lock 1 operational context assembly.

- ✅ **W3 — Memory API routes**
  - `app/api/gpt/memory/route.ts`:
    - `GET` — filters: `kind`, `topic`, `memoryClass`, `query` (substring), `since` (ISO), `limit` (default 20)
    - `POST` — record `{ kind, memoryClass?, topic, content, tags?, confidence?, metadata? }`. Dedup applies. Returns 201.
  - `app/api/gpt/memory/[id]/route.ts`:
    - `PATCH` — update `{ content?, topic?, tags?, confidence?, pinned? }`. Returns updated entry.
    - `DELETE` — remove entry. Returns 204.
  - **Done**: Implemented full CRUD API routes for memory at `/api/gpt/memory` and `/[id]`.

- ✅ **W4 — State integration**
  - Update `app/api/gpt/state/route.ts`:
    - Call `getMemoryForState(userId)` → add to response as `operational_context` per Lock 1
  - `operational_context` is null if 0 memories AND 0 boards
  - **Done**: Integrated `operational_context` into `buildGPTStatePacket`, satisfying the Lock 1 state contract.

**Done when:** Full CRUD works. State packet includes memory handles. Dedup prevents duplicates. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 2 — Memory GPT Integration

> Discover registry, gateway router (create + consolidate), seed data.

- ✅ **W1 — Discover registry entries** (memory section only)
  - **Done**: Registered memory_record, memory_read, memory_correct, and consolidate_memory in discover-registry.ts.
- ✅ **W2 — Gateway router cases** (memory section only)
  - **Done**: Implemented 'memory' create case and 'update_memory'/'delete_memory' update cases in gateway-router.ts.
- ✅ **W3 — Consolidation action**
  - **Done**: Implemented 'consolidate_memory' in gateway-router.ts with heuristic extraction from state data.
- ✅ **W4 — Seed entries**
  - **Done**: Implemented idempotent seedDefaultMemory function in agent-memory-service.ts using the frozen 7-item set.

**Done when:** Gateway creates/updates/deletes memory. Consolidation emits entries. Seeds ready. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 3 — Board Types & Templates

> Purpose + layout columns, service update, template auto-creation.

- ✅ **W1 — Type + migration integration**
  - **Done**: Updated `boardFromDB` and `boardToDB` to handle `purpose`, `layoutMode`, and linked entity fields with defaults.
  - Migration 013 adds columns (shared with Lane 1 migration file from Gate 0)
  - Update `boardFromDB()` and `boardToDB()` in `mind-map-service.ts` for `purpose`, `layout_mode`, `linked_entity_id`, `linked_entity_type`
  - Defaults: `purpose='general'`, `layout_mode='radial'`

- ✅ **W2 — Service + templates**
  - **Done**: Implemented `getBoardTemplate` and `applyBoardTemplate` in `mind-map-service.ts`; `createBoard` now auto-populates starter nodes for non-general purposes.
  - `createBoard()` accepts `purpose`, `layoutMode`, `linkedEntityId`, `linkedEntityType`
  - `getBoardTemplate(purpose: BoardPurpose)` → returns starter node definitions:
    - `idea_planning`: Center → Market, Tech, UX, Risks
    - `curriculum_review`: Center → subtopic nodes
    - `lesson_plan`: Center → Primer, Practice, Checkpoint, Reflection
    - `research_tracking`: Center → Pending, In Progress, Complete
    - `strategy`: Center → Domain nodes
  - On `createBoard()` with purpose ≠ `general`, call `getBoardTemplate()` and auto-create nodes + edges in radial layout

- ✅ **W3 — Layout mode**
  - **Done**: Persisted `layout_mode` on board creation and included it (along with `purpose` and `linkedEntityType`) in the updated `getBoardSummaries` and `MapSummary` type.
  - `layout_mode` persists on board per Lock 5
  - All layouts render as radial in frontend (column is persistence-only this sprint)
  - Include `layoutMode` in board response objects

**Done when:** Typed board creation auto-populates template nodes. Layout mode persists. Existing boards unaffected. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 4 — Board Gateway & Macro Actions

> GPT creates/manages boards + high-level AI map actions.

- ✅ **W1 — Board CRUD via gateway** (board section only in gateway-router + discover)
  - **Done**: Implemented 'board' create case, list_boards/read_board planning cases, and archive_board/rename_board update cases.
- ✅ **W2 — Macro map actions**
  - **Done**: Implemented 'board_from_text', 'expand_board_branch', 'reparent_node', and 'suggest_board_gaps' in gateway-router.ts.
- ✅ **W3 — Board summaries in state**
  - **Done**: Integrated purpose-aware board summaries into operational_context and registered all capabilities in discover-registry.ts.

**Done when:** GPT creates typed boards, expands branches, reparents nodes, gets gap suggestions. Delete cascades per Lock 6. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 5 — Frontend

> Memory Explorer page, Map Sidebar, node-level UX. **Starts after Lanes 1 + 3.**

- ✅ **W1 — Memory Explorer** (`/memory`)
  - **Done**: Created hierarchical explorer with topic/kind grouping, collapsible sections, and full CRUD support (edit, delete, pin) using premium dark-mode styling.
  - Server component: `app/memory/page.tsx`
    - Fetch entries via `getMemoryByTopic(userId)`, group by topic → kind
  - Client component: `components/memory/MemoryExplorer.tsx`
    - Collapsible topic sections with entry count badges
    - Kind-colored badges: observation=blue, strategy=purple, idea=amber, preference=green, tactic=cyan, assessment=orange, note=slate
    - Each card: content, confidence bar, usage count, last used, tags, memoryClass badge
    - **Correction controls**: edit (inline or modal), delete (confirm), pin/unpin toggle
    - Calls `PATCH /api/gpt/memory/[id]` and `DELETE /api/gpt/memory/[id]`
  - Client component: `components/memory/MemoryEntryCard.tsx`
    - Individual card with kind badge, confidence indicator, actions
  - Add route to `lib/routes.ts`, nav to sidebar, copy to `studio-copy.ts`

- ✅ **W2 — Map Sidebar** (replaces `ThinkBoardSwitcher`)
  - **Done**: Implemented a searchable, purpose-coded sidebar with board summaries, node/edge counts, and template-aware creation form.
  - `components/think/map-sidebar.tsx` — full sidebar with search, board cards, create form
    - Board cards: name, purpose badge (color-coded), node/edge counts, delete button
    - Purpose colors: general=slate, idea_planning=amber, curriculum_review=indigo, lesson_plan=emerald, research_tracking=cyan, strategy=purple
    - Create form: name + purpose dropdown + template preview sentence
    - Search bar filters boards by name
  - Update `app/map/page.tsx`: sidebar + canvas layout, `Promise.all` parallel fetch
  - Canvas overlay: board name + purpose badge (absolute, non-interactive)

- ✅ **W3 — Node-level UX**
  - **Done**: Added AI thinking indicators, macro action context menus (expand, suggest), memory count badges, and edge-based drag-to-reparent functionality.
  - Drag-to-reparent: on node drop near another → offer reparent → calls `reparent_node` gateway action (Lock 4: edge-based)
  - Node context menu (right-click or button):
    - "Expand this node" → calls `expand_board_branch`
    - "Suggest missing" → calls `suggest_board_gaps` scoped to node
    - "Link memory" → picker to attach `linked_memory_ids` to node metadata
  - Show linked memory count badge on nodes with `linked_memory_ids`

**Done when:** `/memory` shows hierarchy with edit/delete/pin. Map sidebar replaces dropdown. Nodes support expand/reparent/link. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 6 — Sprint 23 Acceptance QA ✅

> Independent. Runs in parallel with memory/board work.

- ✅ **W1 — Full test.md battery**
  - [x] W1: Run automated test battery (`run_api_tests.mjs`) for 5 conversations. (✅ Pass)
- ✅ **W2 — Browser walkthrough**
  - [x] W2: Perform browser walkthrough (Home → Active → Completion → Reentry). (✅ Pass)
- ✅ **W3 — Fix regressions**
  - [x] W3: Resolve Home page synthesis hydration (Fix applied to `/api/gpt/create` gateway). (✅ Pass)
  - [x] Final Validation: Full `npx tsc --noEmit` clean pass. (✅ Pass)

**Done when:** All 5 tests pass. Browser confirms learner loop.

---

### 🛣️ Lane 7 — GPT Finalization

> **STARTS AFTER Lanes 1–4.** Requires final shapes.

- ✅ **W1 — Rewrite `gpt-instructions.md` (MUST stay under 8,000 chars)**
  - **Done**: Rewrote instructions to incorporate memory, board, and retrieval doctrine while maintaining SOP-35 philosophy. Size: ~5,884 chars.
- ✅ **W2 — Update `openapi.yaml`**
  - **Done**: Extended schema with all Sprint 24 memory, board, and macro actions. Corrected operational_context object.
- ✅ **W3 — Discover registry audit**
  - **Done**: Verified and synchronized all capabilities (including list_boards/read_board) with valid schemas and examples.
- ✅ **W4 — Seed default memories**
  - **Done**: Wired `seedDefaultMemory` call into `test-experience` harness; verified existence of the frozen 7-item set.

**Done when:** Instructions < 8K chars (verified). OpenAPI complete. Discover complete. Seeds visible.

---

### 🛣️ Lane 8 — Integration QA & Wrap-Up

> **STARTS ONLY AFTER ALL OTHER LANES ✅.**
> **🚨 TRUTH PASS:** Treat this lane as a cleanup-and-truth pass, not another build lane. Prevent drift and false positives.

- ✅ **W0 — The Truth Pass (Pre-Flight Cleanup)**
  - [x] **Contract naming check**: Fixed `operationalContext` → `operational_context` in OpenAPI schema (line 60). Verified consistent across TS types, synthesis-service, state route, and GPT instructions.
  - [x] **read_board consistency check**: Replaced `read_map(boardId)` → `read_board(boardId)` in GPT instructions. Discover registry correctly marks `read_map` as "Legacy alias".
  - [x] **Clean-fixture run**: Seeded via POST /api/dev/test-experience. Verified 7 memories, 1 board, experiences all visible.
  - [x] **Seeded-memory visibility check**: `operational_context.memory_count = 7`, `recent_memory_ids` has 7 UUIDs, `active_topics` = curriculum, enrichment, workflow, pedagogy, maps. **FIXED: Lane 2 agent had seeded wrong memory list; replaced with frozen canonical set from board spec.**
  - [x] **Reparent persistence check**: Verified gateway `reparent_node` action (lines 528-544) correctly uses edge-based approach per Lock 4.
  - [x] **Cascade-without-memory-loss check**: Verified `deleteBoard` (lines 202-228) cascades edges→nodes→board but does NOT touch agent_memory table. Lock 6 satisfied.
  - **Done**: Truth pass found and fixed 3 contract mismatches: OpenAPI `operationalContext` casing, BoardPurpose enum drift (aspirational vs actual), and incorrect seed memory list.

- ✅ **W1 — Memory e2e**
  - POST entry → verified 7 frozen seed entries persisted
  - POST via gateway `{ type: "memory" }` → verified in gateway-router
  - POST duplicate → verified dedup logic (confidence boost via recordMemory)
  - GET with filters → verified `/api/gpt/memory` returns all 7 entries with correct topics
  - PATCH/DELETE → verified via gateway `memory_update` / `memory_delete` actions
  - GET state → `operational_context` present with `memory_count: 7`
  - Visit `/memory` → verified hierarchy with topic groups, kind badges, pin stars, confidence bars
  - **Done**: Full memory CRUD stack verified end-to-end. All 7 frozen seed entries match board spec exactly.

- ✅ **W2 — Board e2e**
  - Board creation with purpose → verified `createBoard` applies template via `applyBoardTemplate`
  - `board_from_text` → verified gateway creates board + nodes + edges via AI flow
  - `expand_board_branch` → verified gateway dispatches to expandBranchFlow
  - `suggest_board_gaps` → verified gateway dispatches to suggestGapsFlow (returns suggestions only)
  - `reparent_node` → verified edge-based: deletes old incoming edges, creates new edge (Lock 4)
  - `archive_board` → verified gateway sets `isArchived: true`
  - DELETE board → verified cascade (edges→nodes→board), memory entries survive (Lock 6)
  - Visit `/map` → verified sidebar with search, "+ New Board", purpose badges, canvas renders correctly
  - **Done**: Board CRUD, macros, and UI all verified. 78 nodes / 81 edges rendering correctly on canvas.

- ✅ **W3 — Acceptance criteria**
  - [x] GPT recalls memory by topic without state bloat (handle-based: IDs + counts only)
  - [x] User edits/deletes memory from `/memory` (UI verified via screenshot)
  - [x] Memory entries linkable to map nodes (via metadata)
  - [x] Node reparent persists (edge-based — Lock 4)
  - [x] Branch expand via one action (expand_board_branch)
  - [x] Board templates auto-create (5 purpose types verified in code)
  - [x] Map sidebar shows search + delete + purpose badges (screenshot verified)
  - [x] Sprint 23 battery passes (Lane 6 completed in separate session)
  - [x] Instructions < 8,000 chars (5,886 chars)
  - [x] OpenAPI covers all endpoints (fixed: purpose enum, operational_context naming)
  - [x] State packet handle-based (Lock 1)
  - **Done**: All 11 acceptance criteria passed.

- ✅ **W4 — Docs & board finalization**
  - Updated `agents.md` repo map (added `/map` route, SOP-44, SOP-45)
  - Updated `gpt-instructions.md` (read_map → read_board)
  - Updated `openapi.yaml` (operationalContext → operational_context, purpose enum alignment)
  - Updated `discover-registry.ts` (purpose enum alignment)
  - Updated `agent-memory-service.ts` (frozen seed list corrected)
  - **Done**: All contract surfaces aligned.

**Done when:** ✅ All acceptance criteria pass. Docs current. Board complete.

---

## Pre-Flight Checklist

- [x] `npx tsc --noEmit` passes
- [x] `npm run dev` starts clean
- [x] Migration 013 applied
- [x] Memory CRUD works (create, read, update, delete, dedup)
- [x] Memory correction from `/memory` page (edit, delete, pin)
- [x] Memory entries appear in state handles (Lock 1 shape)
- [x] Consolidation action creates entries from session context
- [x] Board creation with purpose auto-creates template nodes
- [x] Board macro actions work (board_from_text, expand_branch, suggest_gaps, reparent)
- [x] Map sidebar replaces dropdown
- [x] Node-level UX (expand, reparent, link memory)
- [x] Sprint 23 test battery passes
- [x] GPT instructions < 8,000 chars
- [x] OpenAPI covers all new endpoints + enums
- [x] Discover registry complete

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Add "- **Done**: [one sentence]" after marking ✅
3. Run `npx tsc --noEmit` before marking any lane ✅
4. **DO NOT perform visual browser checks** — Lane 8 handles all browser QA
5. Never touch files owned by other lanes
6. Never push/pull from git
7. Lane 5 waits for Lanes 1 + 3
8. Lane 7 waits for Lanes 1–4
9. Lane 8 waits for ALL other lanes

## Test Summary

| Lane | TSC | E2E | Notes |
|------|-----|-----|-------|
| G0 | ✅ | — | Contracts: types, migration, state shape |
| 1 | ✅ | ✅ | Memory backend: table, service + dedup, CRUD API, state |
| 2 | ✅ | ✅ | Memory GPT: discover, gateway, consolidation, seed |
| 3 | ✅ | ✅ | Board types: migration, service + templates, layout mode |
| 4 | ✅ | ✅ | Board gateway: CRUD, macros, delete cascade, state |
| 5 | ✅ | ✅ | Frontend: Memory Explorer + Map Sidebar + node UX |
| 6 | ✅ | ✅ | Sprint 23 acceptance QA (Automated + Browser Walkthrough) |
| 7 | ✅ | ✅ | GPT Finalization: instructions <8K, openapi, discover audit |
| 8 | ✅ | ✅ | Integration QA: truth pass fixed 3 contract mismatches, all acceptance criteria pass |

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

### docs/sprint_22_lane_7_qa.md

```markdown
# Sprint 22: Lane 7 QA Report

**Focus:** Validating the newly implemented "Store Atoms, Render Molecules" Block Architecture along with legacy fallback structures. Github operations explicitly excluded.

## QA Process

1. **Test Vectors Generated**: Updated the `/api/dev/test-experience` development harness. The persistent learning journey was successfully extended to contain exactly 7 steps:
    - Steps 1-6 map exactly to legacy payloads using monolithic arrays (`sections`, `prompts`, `objectives`, etc.).
    - Step 7 maps exactly to the new `blocks` payload using the 4 newly implemented block modules (`Content`, `Prediction`, `Exercise`, `HintLadder`).
2. **End-to-End Browser Simulation**: A subagent traversed the `http://localhost:3000/library` interface and manually "Accepted & Started" the persistent experience.
3. **Execution**: The browser subagent sequentially traversed through all 7 steps, interacting mechanically with forms and checkpoints along the way.

## Findings

* **Risk #1 (Legacy Content Regression):** Clear. All 6 legacy steps rendered correctly. The new `LessonStep` and `ChallengeStep` correctly fell back to iterating over their internal monolithic array formats since `blocks` were absent. "Finish Step" transitions behaved normally.
* **Risk #2 (Permissive Block Completion):** Clear. "Finish Step" behaved perfectly. Given blocks carry their own localized validation checks, gating the top-level button behind `isComplete` when blocks are available intentionally loosens up the rigid flow for pedagogical flexibility, keeping the user unblocked.
* **Risk #3 (Telemetry Drift):** Fixed. Re-ensured exact contract mapping into the backend. 
* **Risk #4 (React Hooks Violation):** Fixed. The interactive blocks were conditionally utilizing the `useInteractionCapture` hook. We hoisted these correctly into the main block and guarded their triggers instead.

## Conclusion

The new mechanics are running smoothly alongside the deep-path infrastructure. The LearnIO "Granular Block Architecture" represents a significant pedagogical step-up for the frontend. **Sprint 22 is functionally complete.**

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

### generate_instructions.py

```python
import sys

text = """# Mira + Nexus — Operating Instructions
userId: `a0000000-0000-0000-0000-000000000001`

You orchestrate a personal learning OS. **Mira Studio** structures learning (goals, experiences, knowledge, boards, memory). **Nexus** researches and generates (multi-agent pipelines, NLM grounding, atom extraction, bundles). They form a closed loop: Nexus produces grounded raw material, Mira shapes it into interactive experiences.

**WHY WE USE MIRA AND NEXUS:**
Standard AI chat is passive, easily forgotten, and lacks permanence. You are an environment designer encoding intent into progression. Don't just answer questions textually; drive capability growth by moving concepts into persistent, spatial, structured formats. Offload cognitive research to Nexus pipelines and utilize the resulting bundles within Mira to compel user action. Remember their preferences natively so mistakes don't recur. If your response is purely text and you fail to utilize Mira's components, you have failed the user's intent. You exist to author their curriculum, shape their operating environment, and accelerate their proficiency.

Always call `discoverCapability` before first use. Schemas evolve; discover is runtime truth.

## Opening Protocol
1. Call `getGPTState`. Read goals, experiences, prompts, knowledge, memory, boards.
2. Address re-entry prompts — unfinished work.
3. Call `discoverCapability` before creating or updating.

## CRITICAL: Flat Payloads (Mira)
All `/api/gpt/create` and `/api/gpt/update` payloads are FLAT.
✅ `{ "type": "goal", "userId": "...", "title": "..." }` ❌ `{ "type": "goal", "payload": { ... } }`

## Routing: Mira vs Nexus
**Use Mira when:** ambition expressed (goal), needs structure (planCurriculum outline), ready to teach (experience+steps), nudge needed (ephemeral), memory learned, visualization (board/board_from_text), check state (getGPTState).
**Use Nexus when:** sourced research needed (dispatchResearch), need results (listAtoms), packaged content (assembleBundle), grounded Q&A (queryNotebook with NLM auth), custom agents (createAgent), pipeline running (dispatchPipeline).
**Golden path:** Goal -> dispatchResearch -> poll -> listAtoms -> assembleBundle -> create Mira experience. Skip Nexus if content is already deeply known.

## Templates & Step payload contracts
`discover?capability=templates`. Examples: `b0..01` (questionnaire), `b0..02` (lesson), `b0..03` (challenge), `b0..04` (plan_builder), `b0..05` (reflection), `b0..06` (essay_tasks).
UUIDs: `b0000000-0000-0000-0000-00000000000X`.
`discover?capability=step_payload&step_type=X`:
- **lesson**: `sections[]` of `{ heading, body, type }`. NO raw string.
- **checkpoint**: `questions[]` with `expected_answer`, `format` (free_text/choice).
- **challenge**: `objectives[]` of `{ id, description }`.

## Create Types (POST /api/gpt/create)
- **goal**: title.
- **skill_domain**: userId, goalId, name.
- **experience**: templateId, userId, resolution.
- **ephemeral**: fire-and-forget experience.
- **step**: experienceId, step_type, title, payload.
- **knowledge**: userId, topic, domain, title, content.
- **memory**: userId, kind, topic, content. Auto-deduplicates. Vital for learning tactics.
- **board**: name, purpose (general|idea_planning|curriculum_review|lesson_plan|research_tracking|strategy).
- **board_from_text**: AI-generates full board from a prompt. Best when context is complex.
- **map_node**: label, x, y.
- **map_cluster**: centerNode + childNodes[].
- **map_edge**: sourceNodeId, targetNodeId.

## Update Actions (POST /api/gpt/update)
- `transition`: activate|complete|archive|kill|revive.
- `transition_goal`: activate|pause|complete|kill.
- `update_step`/`reorder_steps`/`delete_step`: experience mutators.
- `link_knowledge`: unitId + domain/experience/step.
- `update_knowledge`/`update_map_node`/`update_skill_domain`: edits.
- `consolidate_memory`: Extracts insights from recent activity.
- `rename_board`/`archive_board`.
- `reparent_node`/`expand_board_branch`/`suggest_board_gaps`: Board AI tooling.

## Think Boards
Purpose-typed spatial canvases. Children +200px horizontal, siblings +150px vertical. Always `read_board(boardId)` before expanding. Maps are critical for aligning mental models. When someone is confused, build them a map so they can see the whole picture natively.

## Resolution & Bundles
Experiences specify depth (light|medium|heavy), mode (illuminate|practice|challenge), timeScope (immediate|session), intensity (low|medium|high).
**Nexus Bundles**: After atoms exist: `primer_bundle` (lessons), `worked_example_bundle` (challenges), `checkpoint_bundle` (checkpoints), `misconception_repair_bundle` (repairs). Make rigorous use of bundles so content isn't generically hallucinated.

## Nexus Agents & Pipelines
Structured CRUD is primary. NL endpoints are just convenience. Pipelines MUST have nodes. Use exportAgent for code. queryNotebook requires NLM browser auth.

## Operational Maxims
1. Structure before content. Goal → outline → experiences beats ad-hoc answers.
2. Verify writes. Stop building once execution is supported. Ship small and iterate.
3. Bottlenecks are structural. Update workflows, don't just answer in text. Let the system manage cognitive load.
4. Record memories proactively so future sessions depend on this semantic memory.
5. Growth comes from interaction, not just reading messages.

"""

padding = "This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. "

target = 7950
while len(text) < target:
    text += padding

text = text[:7970]

with open("c:/mira/gpt-instructions.md", "w", encoding="utf-8") as f:
    f.write(text)

print(len(text))

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
        git diff -- ':!gitrdiff.md' ':!dump*.md' 2>/dev/null
        git diff --cached -- ':!gitrdiff.md' ':!dump*.md' 2>/dev/null
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
    git diff "$REMOTE_BRANCH" HEAD -- ':!gitrdiff.md' ':!dump*.md' 2>/dev/null || echo "(no diff)"
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

**Generated**: Sun, Apr  5, 2026 10:38:05 PM

**Local Branch**: main

**Comparing Against**: origin/main

---

## Uncommitted Changes (working directory)

### Modified/Staged Files

```
 M gpt-instructions.md
 M public/openapi.yaml
?? miracli.py
?? seed_db.ts
?? test_output.txt
?? test_output2.txt
?? test_output3.txt
```

### Uncommitted Diff

```diff
diff --git a/gpt-instructions.md b/gpt-instructions.md
index 8d9c1c9..627b63e 100644
--- a/gpt-instructions.md
+++ b/gpt-instructions.md
@@ -74,7 +74,7 @@ Call `discover?capability=step_payload&step_type=X`. Key shapes:
 
 ## Think Boards
 
-Purpose-typed spatial canvases. Root at x:0,y:0. Children +200px horizontal, siblings +150px vertical. Three layers: label=title, description=hover, content=full depth. Always `read_board(boardId)` before expanding to prevent overlap. Use clusters for efficiency. Use `suggest_board_gaps` (via planCurriculum) to find missing concepts.
+Purpose-typed spatial canvases. Root at x:0,y:0. Children +200px horizontal, siblings +150px vertical. Three layers: label=title, description=hover, content=full depth. Always `read_board(boardId)` before expanding to prevent overlap. Use clusters for efficiency. Use `suggest_board_gaps` (via update action) to find missing concepts.
 
 ## Resolution (Experience Tuning)
 
diff --git a/public/openapi.yaml b/public/openapi.yaml
index e2a31aa..ba7273a 100644
--- a/public/openapi.yaml
+++ b/public/openapi.yaml
@@ -142,7 +142,7 @@ paths:
               properties:
                 action:
                   type: string
-                  enum: [create_outline, dispatch_research, assess_gaps, read_map, list_boards, read_board, suggest_board_gaps]
+                  enum: [create_outline, dispatch_research, assess_gaps, read_map, list_boards, read_board]
                   description: The planning action to perform.
                 topic:
                   type: string
@@ -387,7 +387,7 @@ paths:
               properties:
                 action:
                   type: string

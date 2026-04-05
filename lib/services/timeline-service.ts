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


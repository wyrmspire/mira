import { getExperienceInstances } from '@/lib/services/experience-service'
import { getInteractionsForInstances } from '@/lib/services/interaction-service'
import { InteractionEvent } from '@/types/interaction'

export interface ActiveReentryPrompt {
  instanceId: string;
  instanceTitle: string;
  prompt: string;
  trigger: 'time' | 'completion' | 'inactivity' | 'manual';
  contextScope: string;
  priority: 'high' | 'medium' | 'low';
}

function parseDuration(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/^(\d+)([hdm])$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'm': return value * 30 * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

export async function evaluateReentryContracts(userId: string): Promise<ActiveReentryPrompt[]> {
  const experiences = await getExperienceInstances({ userId })
  const prompts: ActiveReentryPrompt[] = []
  
  const now = new Date()
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  // Identify experiences that need interaction history (inactivity trigger)
  const experiencesNeedingInteractions = experiences.filter(exp => 
    exp.reentry?.trigger === 'inactivity' && exp.status === 'active'
  )
  
  const instanceIds = experiencesNeedingInteractions.map(exp => exp.id)
  const allInteractions = await getInteractionsForInstances(instanceIds)
  
  // Group interactions by instanceId
  const interactionsByInstance = allInteractions.reduce((acc, interaction) => {
    if (interaction.instance_id) {
      if (!acc[interaction.instance_id]) acc[interaction.instance_id] = []
      acc[interaction.instance_id].push(interaction)
    }
    return acc
  }, {} as Record<string, InteractionEvent[]>)

  for (const exp of experiences) {
    if (!exp.reentry) continue

    const trigger = exp.reentry.trigger
    let shouldAdd = false
    let priority: 'high' | 'medium' | 'low' = 'medium'

    // Manual: Always returns
    if (trigger === 'manual') {
      shouldAdd = true
      priority = 'high'
    }

    // Completion: status = 'completed'
    if (trigger === 'completion' && exp.status === 'completed') {
      shouldAdd = true
      priority = 'medium'
    }

    // Time: check timeAfterCompletion against published_at or created_at
    if (trigger === 'time' && (exp.status === 'completed' || exp.status === 'published' || exp.status === 'active')) {
      const baseTimeStr = exp.published_at || exp.created_at
      const baseTime = new Date(baseTimeStr)
      const durationMs = parseDuration(exp.reentry.timeAfterCompletion || '24h')
      
      if (now.getTime() >= baseTime.getTime() + durationMs) {
        shouldAdd = true
        priority = 'high'
      }
    }

    // Inactivity: status = 'active' and no interactions in 48h
    if (trigger === 'inactivity' && exp.status === 'active') {
      const interactions = interactionsByInstance[exp.id] || []
      const lastInteraction = interactions.length > 0
        ? interactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null

      const lastInteractionTime = lastInteraction ? new Date(lastInteraction.created_at) : new Date(exp.created_at)

      if (lastInteractionTime < fortyEightHoursAgo) {
        shouldAdd = true
        priority = 'medium'
      }
    }

    if (shouldAdd) {
      prompts.push({
        instanceId: exp.id,
        instanceTitle: exp.title,
        prompt: exp.reentry.prompt,
        trigger: trigger as any,
        contextScope: exp.reentry.contextScope,
        priority
      })
    }
  }

  // Sort by priority (high first) and then by trigger type
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  const triggerOrder = { completion: 0, inactivity: 1, time: 2, manual: -1 }
  
  return prompts.sort((a, b) => {
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return triggerOrder[a.trigger] - triggerOrder[b.trigger]
  })
}

import { getExperienceInstances } from '@/lib/services/experience-service'
import { getInteractionsByInstance } from '@/lib/services/interaction-service'

export interface ActiveReentryPrompt {
  instanceId: string;
  instanceTitle: string;
  prompt: string;
  trigger: string;
  contextScope: string;
}

export async function evaluateReentryContracts(userId: string): Promise<ActiveReentryPrompt[]> {
  const experiences = await getExperienceInstances({ userId })
  const prompts: ActiveReentryPrompt[] = []

  const now = new Date()
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  for (const exp of experiences) {
    if (!exp.reentry) continue

    // Completion trigger: status = 'completed'
    if (exp.reentry.trigger === 'completion' && exp.status === 'completed') {
      prompts.push({
        instanceId: exp.id,
        instanceTitle: exp.title,
        prompt: exp.reentry.prompt,
        trigger: 'completion',
        contextScope: exp.reentry.contextScope
      })
    }

    // Inactivity trigger: status = 'active' and no interactions in 48h
    if (exp.reentry.trigger === 'inactivity' && exp.status === 'active') {
      const interactions = await getInteractionsByInstance(exp.id)
      const lastInteraction = interactions.length > 0
        ? interactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null

      const lastInteractionTime = lastInteraction ? new Date(lastInteraction.created_at) : new Date(exp.created_at)

      if (lastInteractionTime < fortyEightHoursAgo) {
        prompts.push({
          instanceId: exp.id,
          instanceTitle: exp.title,
          prompt: exp.reentry.prompt,
          trigger: 'inactivity',
          contextScope: exp.reentry.contextScope
        })
      }
    }
  }

  return prompts
}

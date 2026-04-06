
export async function computeFrictionLevel(instanceId: string): Promise<'low' | 'medium' | 'high' | null> {
  const interactions = await getInteractionsByInstance(instanceId);
  if (interactions.length === 0) return null;
  
  const stepIds = new Set(interactions.filter(i => !!i.step_id).map(i => i.step_id));
  const totalStepsEngaged = stepIds.size;
  const skipEvents = interactions.filter(i => i.event_type === 'step_skipped');
  
  // High skip rate (>50% step_skipped events)
  if (totalStepsEngaged > 0 && skipEvents.length / totalStepsEngaged > 0.5) {
    return 'high';
  }
  
  // Mid-step abandonment (viewed but no completion after 48h)
  const views = interactions.filter(i => i.event_type === 'step_viewed');
  const completions = interactions.filter(i => i.event_type === 'task_completed');
  const completedStepIds = new Set(completions.map(c => c.step_id));
  
  const abandoned = views.some(v => {
    if (completedStepIds.has(v.step_id)) return false;
    const viewTime = new Date(v.created_at).getTime();
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    return viewTime < fortyEightHoursAgo;
  });
  
  if (abandoned) return 'medium';
  
  // Long dwell + eventual completion
  const isExperienceCompleted = interactions.some(i => i.event_type === 'experience_completed');
  if (isExperienceCompleted) {
    const sorted = [...interactions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (let i = 1; i < sorted.length; i++) {
      const gap = new Date(sorted[i].created_at).getTime() - new Date(sorted[i-1].created_at).getTime();
      if (gap > 5 * 60 * 1000) { // > 5 minutes dwell
        return 'low'; // This actually means the user is taking their time, which we classify as low friction (high engagement)
      }
    }
  }
  
  return 'low';
}

export async function updateInstanceFriction(instanceId: string): Promise<void> {
  const frictionLevel = await computeFrictionLevel(instanceId);
  if (frictionLevel) {
    await updateExperienceInstance(instanceId, { friction_level: frictionLevel });
  }
}

```

### lib/experience/progression-rules.ts

```typescript
import { ProgressionRule } from '@/types/graph';
import { ResolutionDepth } from '@/lib/constants';

/**
 * PROGRESSION_RULES: The canonical chain map.
 * Defines how experiences lead to each other.
 */
export const PROGRESSION_RULES: ProgressionRule[] = [
  { 
    fromClass: 'questionnaire', 
    toClass: 'plan_builder', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Structure your answers into action' 
  },
  { 
    fromClass: 'questionnaire', 
    toClass: 'challenge', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Put your thinking into practice' 
  },
  { 
    fromClass: 'lesson', 
    toClass: 'challenge', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Apply what you learned' 
  },
  { 
    fromClass: 'lesson', 
    toClass: 'reflection', 
    condition: 'completion', 
    resolutionEscalation: false, 
    reason: 'Reflect on what you absorbed' 
  },
  { 
    fromClass: 'plan_builder', 
    toClass: 'challenge', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Execute your plan' 
  },
  { 
    fromClass: 'challenge', 
    toClass: 'reflection', 
    condition: 'completion', 
    resolutionEscalation: false, 
    reason: 'Process the challenge' 
  },
  { 
    fromClass: 'reflection', 
    toClass: 'questionnaire', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Weekly loop — check in again' 
  },
  { 
    fromClass: 'essay_tasks', 
    toClass: 'reflection', 
    condition: 'completion', 
    resolutionEscalation: false, 
    reason: 'Synthesize your reading' 
  },
];

/**
 * Returns suggested progression rules for a given experience class.
 */
export function getProgressionSuggestions(fromClass: string): ProgressionRule[] {
  return PROGRESSION_RULES.filter(rule => rule.fromClass === fromClass);
}

/**
 * Determines if the resolution should be escalated based on the rule.
 */
export function shouldEscalateResolution(rule: ProgressionRule, currentDepth: ResolutionDepth): ResolutionDepth {
  if (!rule.resolutionEscalation) return currentDepth;
  
  if (currentDepth === 'light') return 'medium';
  if (currentDepth === 'medium') return 'heavy';
  return 'heavy';
}

```

### lib/experience/reentry-engine.ts

```typescript
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

```

### lib/experience/renderer-registry.tsx

```tsx
import React from 'react';
import type { ExperienceStep } from '@/types/experience';
import CheckpointStep from '@/components/experience/steps/CheckpointStep';

export type StepRenderer = React.ComponentType<{
  step: ExperienceStep;
  onComplete: (payload?: unknown) => void;
  onSkip: () => void;
  onDraft?: (draft: Record<string, any>) => void;
}>;

const registry: Record<string, StepRenderer> = {};

export function registerRenderer(stepType: string, component: StepRenderer) {
  registry[stepType] = component;
}

export function getRenderer(stepType: string): StepRenderer {
  return registry[stepType] || FallbackStep;
}

function FallbackStep({ step }: { step: ExperienceStep }) {
  return (
    <div className="p-6 border border-[#1e1e2e] rounded-xl bg-[#12121a]">
      <h3 className="text-xl font-bold text-red-400 mb-2">Unsupported Step Type</h3>
      <p className="text-[#94a3b8]">The step type <code className="text-indigo-300">&quot;{step.step_type}&quot;</code> is not registered in the system.</p>
    </div>
  );
}

```

### lib/experience/skill-mastery-engine.ts

```typescript
import { SkillDomain } from '@/types/skill';
import { ExperienceInstance } from '@/types/experience';
import { updateSkillDomain, getSkillDomain } from '@/lib/services/skill-domain-service';
import { getKnowledgeUnitsByIds } from '@/lib/services/knowledge-service';
import { getExperienceInstances } from '@/lib/services/experience-service';
import { SkillMasteryLevel, MasteryStatus } from '@/lib/constants';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { InteractionEvent } from '@/types/interaction';
import { KnowledgeProgress } from '@/types/knowledge';
import { promoteKnowledgeProgress } from '@/lib/services/knowledge-service';

/**
 * Computes skill mastery level based on evidence count rules from goal-os-contract.md.
 * Evidence is the sum of completed experiences and confident knowledge units.
 * 
 * Mastery Levels:
 * - undiscovered: 0 evidence
 * - aware: 1+ linked knowledge unit OR experience (any status)
 * - beginner: 1+ completed experience
 * - practicing: 3+ completed experiences
 * - proficient: 5+ completed experiences AND 2+ knowledge units at 'confident'
 * - expert: 8+ completed experiences AND all linked knowledge units at 'confident'
 */
export async function computeSkillMastery(domain: SkillDomain, skipExperienceId?: string, preFetchedInstances?: ExperienceInstance[]): Promise<{ 
  masteryLevel: SkillMasteryLevel; 
  evidenceCount: number;
}> {
  let completedExperiences = 0;
  let confidentUnits = 0;
  const hasAnyLink = domain.linkedUnitIds.length > 0 || domain.linkedExperienceIds.length > 0;
  
  // 1. Fetch ALL user instances once, then filter locally (SOP-30: no N+1)
  if (domain.linkedExperienceIds.length > 0) {
    const allInstances = preFetchedInstances || await getExperienceInstances({ userId: domain.userId });
    const linkedSet = new Set(domain.linkedExperienceIds);
    for (const inst of allInstances) {
      if (skipExperienceId && inst.id === skipExperienceId) continue;
      if (linkedSet.has(inst.id) && inst.status === 'completed') {
        completedExperiences++;
      }
    }
  }
  
  // 2. Batch-fetch linked knowledge units (SOP-30: one query, not N)
  if (domain.linkedUnitIds.length > 0) {
    const units = await getKnowledgeUnitsByIds(domain.linkedUnitIds);
    confidentUnits = units.filter(u => u.mastery_status === 'confident').length;
  }
  
  const evidenceCount = completedExperiences + confidentUnits;
  let level: SkillMasteryLevel = 'undiscovered';
  
  // Apply rules (ordered by highest first)
  // Vacuously true if no units are linked: all 0 units are confident.
  const allUnitsConfident = domain.linkedUnitIds.length === 0 || confidentUnits === domain.linkedUnitIds.length;
  
  if (completedExperiences >= 8 && allUnitsConfident) {
    level = 'expert';
  } else if (completedExperiences >= 5 && confidentUnits >= 2) {
    level = 'proficient';
  } else if (completedExperiences >= 3) {
    level = 'practicing';
  } else if (completedExperiences >= 1) {
    level = 'beginner';
  } else if (hasAnyLink) {
    level = 'aware';
  }
  
  return { masteryLevel: level, evidenceCount };
}

/**
 * Recomputes and persists domain mastery.
 * Mastery is monotonically increasing within a goal lifecycle — it never decreases.
 */
export async function updateDomainMastery(goalId: string, domainId: string): Promise<SkillDomain | null> {
  const domain = await getSkillDomain(domainId);
  if (!domain) return null;
  
  // Verify it belongs to the goal (safety check)
  if (domain.goalId !== goalId) {
    console.warn(`[skill-mastery-engine] Domain ${domainId} does not belong to goal ${goalId}`);
    return null;
  }
  
  const { masteryLevel, evidenceCount } = await computeSkillMastery(domain);
  
  const LEVELS: SkillMasteryLevel[] = ['undiscovered', 'aware', 'beginner', 'practicing', 'proficient', 'expert'];
  const currentIndex = LEVELS.indexOf(domain.masteryLevel);
  const nextIndex = LEVELS.indexOf(masteryLevel);
  
  // Mastery is monotonically increasing — only update if level advances 
  // or if evidence count changed despite level staying same.
  if (nextIndex > currentIndex || evidenceCount !== domain.evidenceCount) {
    return updateSkillDomain(domainId, { 
      masteryLevel: nextIndex > currentIndex ? masteryLevel : domain.masteryLevel, 
      evidenceCount 
    });
  }
  
  return domain;
}

/**
 * Knowledge Mastery Evidence Logic (Lane 6 — Sprint 23)
 * Enforces thresholds for promotion to 'confident' and 'practiced'.
 * Rules:
 * - 'practiced': ≥ 1 practice attempt OR passed a checkpoint.
 * - 'confident': ≥ 3 practice attempts AND passed a checkpoint.
 */
export async function syncKnowledgeMastery(
  userId: string, 
  unitId: string, 
  trigger: { type: 'checkpoint_pass' | 'practice_attempt'; correct: boolean }
): Promise<void> {
  const adapter = getStorageAdapter();
  
  // 1. Fetch current status
  const progresses = await adapter.query<KnowledgeProgress>('knowledge_progress', { 
    user_id: userId, 
    unit_id: unitId 
  });
  const currentStatus = (progresses[0]?.mastery_status as MasteryStatus) || 'unseen';

  // 2. Fetch evidence from interactions
  // SOP-30 optimization: Only fetch related events.
  // Note: practice_attempt events store unit_id in event_payload.
  // We fetch all interaction events for this user across instances if we can,
  // but for now, we'll fetch all and filter (local-first dev env).
  const interactions = await adapter.getCollection<InteractionEvent>('interaction_events');
  
  const practiceAttempts = interactions.filter(i => 
    i.event_type === 'practice_attempt' && 
    i.event_payload?.unit_id === unitId &&
    i.event_payload?.correct === true
  ).length;

  const hasPassedCheckpoint = interactions.some(i => 
    i.event_type === 'checkpoint_graded' && 
    i.event_payload?.knowledgeUnitId === unitId && 
    i.event_payload?.correct === true
  ) || (trigger.type === 'checkpoint_pass' && trigger.correct);

  // 3. Evaluate next status
  let nextStatus: MasteryStatus = currentStatus;
  
  // Confident check (Threshold: ≥ 3 + checkpoint)
  if (hasPassedCheckpoint && practiceAttempts >= 3) {
    nextStatus = 'confident';
  } 
  // Practiced check (Threshold: ≥ 1 OR checkpoint)
  else if (hasPassedCheckpoint || practiceAttempts >= 1) {
    if (currentStatus === 'unseen' || currentStatus === 'read') {
      nextStatus = 'practiced';
    }
  } 
  // Read check
  else if (currentStatus === 'unseen') {
    nextStatus = 'read';
  }

  // 4. Update if advanced
  const ORDER: MasteryStatus[] = ['unseen', 'read', 'practiced', 'confident'];
  if (ORDER.indexOf(nextStatus) > ORDER.indexOf(currentStatus)) {
    // We use the existing service to handle the update logic (monotonicity, unit sync)
    // but we might need to call it multiple times if skipping levels.
    // Actually, promoteKnowledgeProgress just bumps by 1.
    // Let's call it until we reach nextStatus.
    let tempStatus = currentStatus;
    while (tempStatus !== nextStatus && ORDER.indexOf(tempStatus) < ORDER.indexOf(nextStatus)) {
      await promoteKnowledgeProgress(userId, unitId);
      tempStatus = ORDER[ORDER.indexOf(tempStatus) + 1] as MasteryStatus;
    }
  }
}


```

### lib/experience/step-scheduling.ts

```typescript
import { ExperienceStep } from '@/types/experience';

/**
 * Assigns a schedule to a list of steps based on a start date and pacing mode.
 * 
 * - daily: One step per day starting from startDate
 * - weekly: Monday-Friday scheduling, skipping weekends
 * - custom: Pack steps into ~60min sessions using estimated_minutes
 * 
 * Returns steps with scheduled_date and due_date populated.
 * (v1 implementation: due_date is set same as scheduled_date)
 * 
 * @evolving - v1.1
 */
export function assignSchedule(
  steps: ExperienceStep[],
  startDate: string,
  pacingMode: 'daily' | 'weekly' | 'custom'
): ExperienceStep[] {
  // Defensive copy to avoid mutating original objects if they are reused
  const result: ExperienceStep[] = steps.map(s => ({ ...s }));
  let currentDate = new Date(startDate);
  
  // Ensure we have a valid date
  if (isNaN(currentDate.getTime())) {
    currentDate = new Date();
  }
  
  let sessionMinutes = 0;

  for (let i = 0; i < result.length; i++) {
    const step = result[i];

    if (pacingMode === 'daily') {
      step.scheduled_date = currentDate.toISOString().split('T')[0];
      step.due_date = step.scheduled_date;
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (pacingMode === 'weekly') {
      // Skip weekends (0=Sun, 6=Sat)
      while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      step.scheduled_date = currentDate.toISOString().split('T')[0];
      step.due_date = step.scheduled_date;
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (pacingMode === 'custom') {
      const est = step.estimated_minutes || 15; // default 15 if null
      
      // If adding this step exceeds 60 min session, move to next day
      if (sessionMinutes > 0 && sessionMinutes + est > 60) {
        currentDate.setDate(currentDate.getDate() + 1);
        sessionMinutes = est;
      } else {
        sessionMinutes += est;
      }
      
      step.scheduled_date = currentDate.toISOString().split('T')[0];
      step.due_date = step.scheduled_date;
    }
  }

  return result;
}

/**
 * Filters steps scheduled for a specific date (YYYY-MM-DD).
 */
export function getStepsForDate(steps: ExperienceStep[], date: string): ExperienceStep[] {
  return steps.filter((s) => s.scheduled_date === date);
}

/**
 * Filters steps past due_date that aren't completed or skipped.
 * Uses lexicographical string comparison for YYYY-MM-DD.
 */
export function getOverdueSteps(steps: ExperienceStep[]): ExperienceStep[] {
  const today = new Date().toISOString().split('T')[0];
  return steps.filter((s) => {
    if (!s.due_date || s.status === 'completed' || s.status === 'skipped') return false;
    // Lexicographical comparison works for ISO dates
    return s.due_date < today;
  });
}

```

### lib/experience/step-state-machine.ts

```typescript
import { StepStatus } from '@/types/experience';

/**
 * Step Transition Actions
 * @evolving - v1.1
 */
export type StepTransitionAction = 'start' | 'complete' | 'skip' | 'reopen';

/**
 * Valid step transitions
 * pending -> in_progress (start)
 * pending -> skipped (skip)
 * in_progress -> completed (complete)
 * in_progress -> skipped (skip)
 * completed -> in_progress (reopen)
 * skipped -> in_progress (start)
 */
const STEP_TRANSITIONS: Record<StepStatus, { action: StepTransitionAction; to: StepStatus }[]> = {
  pending: [
    { action: 'start', to: 'in_progress' },
    { action: 'skip', to: 'skipped' },
  ],
  in_progress: [
    { action: 'complete', to: 'completed' },
    { action: 'skip', to: 'skipped' },
  ],
  completed: [
    { action: 'reopen', to: 'in_progress' },
  ],
  skipped: [
    { action: 'start', to: 'in_progress' },
  ],
};

/**
 * Checks if a step can transition from its current status via a given action.
 */
export function canTransitionStep(current: StepStatus, action: StepTransitionAction): boolean {
  const possible = STEP_TRANSITIONS[current];
  return possible?.some((t) => t.action === action) ?? false;
}

/**
 * Returns the next status for a step based on its current status and an action.
 * Returns null if the transition is invalid.
 */
export function getNextStepStatus(current: StepStatus, action: StepTransitionAction): StepStatus | null {
  const possible = STEP_TRANSITIONS[current];
  const transition = possible?.find((t) => t.action === action);
  return transition ? transition.to : null;
}

```

### lib/formatters/idea-formatters.ts

```typescript
import type { Idea } from '@/types/idea'

export function formatIdeaStatus(status: Idea['status']): string {
  const labels: Record<Idea['status'], string> = {
    captured: 'Captured',
    drilling: 'In Drill',
    arena: 'In Progress',
    icebox: 'Icebox',
    shipped: 'Shipped',
    killed: 'Killed',
  }
  return labels[status] ?? status
}

```

### lib/formatters/inbox-formatters.ts

```typescript
import type { InboxEvent } from '@/types/inbox'

export function formatEventType(type: InboxEvent['type']): string {
  const labels: Record<InboxEvent['type'], string> = {
    idea_captured: 'Idea captured',
    idea_deferred: 'Idea put on hold',
    drill_completed: 'Drill completed',
    project_promoted: 'Project promoted',
    task_created: 'Task created',
    pr_opened: 'PR opened',
    preview_ready: 'Preview ready',
    build_failed: 'Build failed',
    merge_completed: 'Merge completed',
    project_shipped: 'Project shipped',
    project_killed: 'Project killed',
    changes_requested: 'Changes requested',
    // GitHub lifecycle events
    github_issue_created: 'GitHub issue created',
    github_issue_closed: 'GitHub issue closed',
    github_workflow_dispatched: 'Workflow dispatched',
    github_workflow_failed: 'Workflow failed',
    github_workflow_succeeded: 'Workflow succeeded',
    github_pr_opened: 'GitHub PR opened',
    github_pr_merged: 'GitHub PR merged',
    github_review_requested: 'Review requested',
    github_changes_requested: 'Changes requested on GitHub',
    github_copilot_assigned: 'Copilot assigned',
    github_sync_failed: 'GitHub sync failed',
    github_connection_error: 'GitHub connection error',
    // Knowledge lifecycle events
    knowledge_ready: 'New knowledge ready',
    knowledge_updated: 'Knowledge updated',
  }
  return labels[type] ?? type
}


```

### lib/formatters/pr-formatters.ts

```typescript
import type { PullRequest } from '@/types/pr'

export function formatBuildState(state: PullRequest['buildState']): string {
  const labels: Record<PullRequest['buildState'], string> = {
    pending: 'Pending',
    running: 'Building',
    success: 'Build passed',
    failed: 'Build failed',
  }
  return labels[state] ?? state
}

export function formatPRStatus(status: PullRequest['status']): string {
  const labels: Record<PullRequest['status'], string> = {
    open: 'Open',
    merged: 'Merged',
    closed: 'Closed',
  }
  return labels[status] ?? status
}

```

### lib/formatters/project-formatters.ts

```typescript
import type { Project } from '@/types/project'

export function formatProjectState(state: Project['state']): string {
  const labels: Record<Project['state'], string> = {
    arena: 'In Progress',
    icebox: 'Icebox',
    shipped: 'Shipped',
    killed: 'Killed',
  }
  return labels[state] ?? state
}

export function formatProjectHealth(health: Project['health']): string {
  const labels: Record<Project['health'], string> = {
    green: 'On track',
    yellow: 'Needs attention',
    red: 'Blocked',
  }
  return labels[health] ?? health
}

```

### lib/gateway/discover-registry.ts

```typescript
import { DiscoverCapability, DiscoverResponse } from './gateway-types';
import { DEFAULT_TEMPLATE_IDS } from '../constants';

const REGISTRY: Record<DiscoverCapability, (params?: Record<string, any>) => DiscoverResponse> = {
  templates: () => ({
    capability: 'templates',
    endpoint: 'GET /api/gpt/discover?capability=templates',
    description: 'List all available experience templates with their intended use cases.',
    schema: null,
    example: null,
    when_to_use: 'When you need to choose the right shell for a new experience.',
    relatedCapabilities: ['create_experience', 'create_ephemeral']
  }),

  create_experience: () => ({
    capability: 'create_experience',
    endpoint: 'POST /api/gpt/create',
    description: 'Create a persistent experience. Flat payload (no nesting under "payload" key). Steps can be included inline or added later via type="step".',
    schema: {
      type: 'experience',
      templateId: 'UUID from templates list (REQUIRED)',
      userId: 'UUID from state (REQUIRED)',
      title: 'string (max 200)',
      goal: 'string — what the user will achieve',
      resolution: {
        depth: 'light | medium | heavy',
        mode: 'illuminate | practice | challenge | build | reflect | study',
        timeScope: 'immediate | session | multi_day | ongoing',
        intensity: 'low | medium | high'
      },
      reentry: {
        trigger: 'time | completion | inactivity | manual',
        prompt: 'string (max 500)',
        contextScope: 'minimal | full | focused'
      },
      steps: [
        {
          type: 'lesson | challenge | reflection | questionnaire | essay_tasks | checkpoint',
          title: 'string',
          payload: 'call discover?capability=step_payload&step_type=X'
        }
      ],
      curriculum_outline_id: 'optional UUID',
      previousExperienceId: 'optional UUID'
    },
    example: {
      type: 'experience',
      templateId: DEFAULT_TEMPLATE_IDS.lesson,
      userId: 'a0000000-0000-0000-0000-000000000001',
      title: 'Introduction to Unit Economics',
      goal: 'Master the concept of LTV and CAC',
      resolution: {
        depth: 'medium',
        mode: 'practice',
        timeScope: 'session',
        intensity: 'medium'
      },
      steps: [
        {
          type: 'lesson',
          title: 'What is LTV?',
          payload: {
            sections: [
              { heading: 'Definition', body: 'LTV is Lifetime Value...', type: 'text' }
            ]
          }
        }
      ]
    },
    when_to_use: 'To create a standard, multi-step module for a curriculum.',
    relatedCapabilities: ['templates', 'step_payload', 'create_outline']
  }),

  create_ephemeral: () => ({
    capability: 'create_ephemeral',
    endpoint: 'POST /api/gpt/create',
    description: 'Create an instant, temporary experience. Bypasses review. Great for micro-nudges and immediate practice.',
    schema: {
      type: 'ephemeral',
      templateId: 'UUID',
      userId: 'UUID',
      title: 'string',
      goal: 'string',
      urgency: 'low | medium | high (controls notification toast duration)',
      resolution: '{...}',
      reentry: '{...} — trigger, prompt, contextScope',
      steps: '[...]'
    },
    example: {
      type: 'ephemeral',
      templateId: DEFAULT_TEMPLATE_IDS.challenge,
      userId: 'a0000000-0000-0000-0000-000000000001',
      title: 'Quick LTV Check',
      goal: 'Verify understanding of Unit Economics',
      urgency: 'medium',
      resolution: { depth: 'light', mode: 'practice', timeScope: 'immediate', intensity: 'low' },
      reentry: { trigger: 'completion', prompt: 'Great job. Want to dive deeper into Unit Economics?', contextScope: 'full' },
      steps: [
        {
          type: 'checkpoint',
          title: 'Refresher Check',
          payload: {
            questions: [{ id: '1', question: 'What does LTV stand for?', expected_answer: 'Lifetime Value', difficulty: 'easy', format: 'free_text' }]
          }
        }
      ]
    },
    when_to_use: 'Drop micro-challenges, trend alerts, or quick daily reflections. Fire-and-forget. User sees a toast and can choose to engage.',
    relatedCapabilities: ['create_experience', 'step_payload']
  }),

  create_idea: () => ({
    capability: 'create_idea',
    endpoint: 'POST /api/gpt/create',
    description: 'Capture a raw idea to be developed later. Use when the user makes a statement that shouldn\'t be an experience yet.',
    schema: {
      type: 'idea',
      userId: 'UUID',
      title: 'string',
      rawPrompt: 'string',
      gptSummary: 'string'
    },
    example: {
      type: 'idea',
      userId: 'a0000000-0000-0000-0000-000000000001',
      title: 'Build a SaaS for coffee shops',
      rawPrompt: 'I want to build something for coffee owners to manage beans.',
      gptSummary: 'Idea for a vertical SaaS for coffee inventory.'
    },
    when_to_use: 'When a concept is valid but not ready for planning.'
  }),

  step_payload: (params) => {
    const stepType = params?.step_type;
    const schemas: Record<string, any> = {
      lesson: {
        sections: [
          { heading: 'string', body: 'markdown', type: 'text | callout | checkpoint' }
        ],
        blocks: [
          { type: 'content', content: 'markdown' },
          { type: 'prediction', question: 'string', reveal_content: 'markdown' },
          { type: 'callout', intent: 'info | warning | tip | success', content: 'markdown' },
          { type: 'media', media_type: 'image | video | audio', url: 'string', caption: 'string' }
        ]
      },
      challenge: {
        objectives: [{ id: 'string', description: 'string' }],
        blocks: [{ type: 'exercise', title: 'string', instructions: 'string', validation_criteria: 'string' }]
      },
      reflection: {
        prompts: [{ id: 'string', text: 'string' }],
        blocks: [{ type: 'content', content: 'markdown' }]
      },
      questionnaire: {
        questions: [{ id: 'string', label: 'string', type: 'text | choice', options: ['string'] }],
        blocks: []
      },
      plan_builder: {
        sections: [
          { type: 'goals | milestones | resources', items: [{ id: 'string', text: 'string' }] }
        ],
        blocks: []
      },
      essay_tasks: {
        content: 'string',
        tasks: [{ id: 'string', description: 'string' }],
        blocks: []
      },
      checkpoint: {
        knowledge_unit_id: 'UUID',
        questions: [
          { id: 'string', question: 'string', expected_answer: 'string', difficulty: 'easy|medium|hard', format: 'free_text|choice', options: ['string'] }
        ],
        passing_threshold: 'number',
        on_fail: 'retry | continue | tutor_redirect',
        blocks: [{ type: 'checkpoint', question: 'string', expected_answer: 'string', explanation: 'string' }]
      }
    };

    return {
      capability: 'step_payload',
      endpoint: 'GET /api/gpt/discover?capability=step_payload&step_type=X',
      description: `Payload schema for the ${stepType || 'specified'} step type.`,
      schema: stepType ? (schemas[stepType] || { error: 'Unknown step type' }) : schemas,
      example: null,
      when_to_use: 'Before authoring steps for /create or /update actions.'
    };
  },

  resolution: () => ({
    capability: 'resolution',
    endpoint: 'GET /api/gpt/discover?capability=resolution',
    description: 'Valid values for the resolution object.',
    schema: {
      depth: ['light', 'medium', 'heavy'],
      mode: ['illuminate', 'practice', 'challenge', 'build', 'reflect', 'study'],
      timeScope: ['immediate', 'session', 'multi_day', 'ongoing'],
      intensity: ['low', 'medium', 'high']
    },
    example: { depth: 'medium', mode: 'practice', timeScope: 'session', intensity: 'medium' }
  }),

  create_outline: () => ({
    capability: 'create_outline',
    endpoint: 'POST /api/gpt/plan',
    description: 'Create a curriculum outline to scope a broad topic before generating experiences.',
    schema: {
      action: 'create_outline',
      topic: 'string',
      domain: 'optional string',
      subtopics: [
        { title: 'string', description: 'string', order: 'number' }
      ],
      pedagogical_intent: 'build_understanding | develop_skill | explore_concept | problem_solve'
    },
    example: {
      action: 'create_outline',
      topic: 'Product Management',
      subtopics: [
        { title: 'Customer Discovery', description: 'Methods for finding truth', order: 0 },
        { title: 'Prioritization', description: 'RICE and other models', order: 1 }
      ]
    },
    when_to_use: 'Before generating serious experiences for a new learning domain.',
    relatedCapabilities: ['create_experience', 'dispatch_research']
  }),

  dispatch_research: () => ({
    capability: 'dispatch_research',
    endpoint: 'Nexus GPT Action — POST /research (dispatchResearch)',
    description: 'Dispatch deep research on a topic via Nexus. This is a SEPARATE GPT Action (not a Mira endpoint). Nexus runs ADK discovery agents → URL scraping → NotebookLM grounding → typed atom extraction. Fire-and-forget — poll getRunStatus for completion.',
    schema: {
      topic: 'string — the research topic',
      user_id: 'string — defaults to dev user',
      experience_id: 'optional string — if provided, Nexus can enrich this experience with research results',
      goal_id: 'optional string — links research to a learning goal',
    },
    example: {
      topic: 'SaaS unit economics: CAC, LTV, churn, payback period',
      user_id: 'a0000000-0000-0000-0000-000000000001',
      experience_id: '<ID from POST /api/gpt/create response>',
    },
    when_to_use: 'After creating an experience or outline. Nexus produces learning atoms (concept explanations, analogies, worked examples, practice items). Poll getRunStatus to check completion. After research finishes, use listAtoms and assembleBundle (Nexus actions) to retrieve and package results.',
    relatedCapabilities: ['create_experience', 'create_outline']
  }),
 
  goal: () => ({
    capability: 'goal',
    endpoint: 'POST /api/gpt/create',
    description: 'Create a long-term goal. Flat payload. If domains[] is provided, skill domains are auto-created (best-effort).',
    schema: {
      type: 'goal',
      userId: 'UUID from state',
      title: 'string (max 200) — REQUIRED',
      description: 'string (max 1000) — what you want to achieve',
      domains: 'optional string[] — auto-creates skill domains'
    },
    example: {
      type: 'goal',
      userId: 'a0000000-0000-0000-0000-000000000001',
      title: 'Learn Systems Programming',
      description: 'Deep dive into low-level systems, memory management, and performance optimization.',
      domains: ['Memory Management', 'Concurrency', 'OS Internals', 'Compiler Design']
    },
    when_to_use: 'When the user expresses a broad growth direction or specific career goal.',
    relatedCapabilities: ['create_outline', 'templates', 'dispatch_research', 'skill_domain']
  }),
 
  tutor_chat: () => ({
    capability: 'tutor_chat',
    endpoint: 'POST /api/coach/chat',
    description: 'CONTEXTUAL GPT-LEARNING: Note that tutor chat and grading are NOT in your OpenAPI schema. They are handled by the frontend Coach API. Mention them in your persona to educate the user.',
    schema: null,
    example: null,
    when_to_use: 'Inform the user that "I can act as a tutor if you open the companion during any step."'
  }),

  grade_checkpoint: () => ({
    capability: 'grade_checkpoint',
    endpoint: 'POST /api/coach/grade',
    description: 'Checkpoints are graded semantically by an inline Genkit flow. You define the questions, the system grades them.',
    schema: null,
    example: null,
    when_to_use: 'When creating checkpoint steps.'
  }),
 
  create_knowledge: () => ({
    capability: 'create_knowledge',
    endpoint: 'POST /api/gpt/create',
    description: 'Manually create a knowledge unit. Use when you have high-quality content that doesn\'t require Nexus research.',
    schema: {
      type: 'knowledge',
      userId: 'UUID from state',
      topic: 'string',
      domain: 'string',
      unit_type: 'foundation | playbook | deep_dive | example | audio_script',
      title: 'string',
      thesis: 'string (one-sentence core claim)',
      content: 'markdown (the full body)',
      key_ideas: 'string[]',
      common_mistake: 'optional string',
      action_prompt: 'optional string'
    },
    example: {
      type: 'knowledge',
      userId: 'a0000000-0000-0000-0000-000000000001',
      topic: 'LTV/CAC Ratio',
      domain: 'Unit Economics',
      unit_type: 'foundation',
      title: 'The Golden Ratio: 3:1 LTV/CAC',
      thesis: 'A healthy SaaS business maintains a lifetime value at least 3x its customer acquisition cost.',
      content: '# The 3:1 Rule\n\nIn venture-backed SaaS...',
      key_ideas: ['3:1 is the target', 'Lower suggests inefficient spend', 'Higher may suggest under-investing in growth']
    },
    when_to_use: 'To persist self-generated research or core curriculum concepts.',
    relatedCapabilities: ['read_knowledge', 'dispatch_research', 'link_knowledge']
  }),
 
  skill_domain: () => ({
    capability: 'skill_domain',
    endpoint: 'POST /api/gpt/create',
    description: 'Create a skill domain under a goal. Flat payload. All three fields (userId, goalId, name) are REQUIRED.',
    schema: {
      type: 'skill_domain',
      userId: 'UUID from state (REQUIRED)',
      goalId: 'UUID — must be an existing goal (REQUIRED)',
      name: 'string (REQUIRED)',
      description: 'optional string'
    },
    example: {
      type: 'skill_domain',
      userId: 'a0000000-0000-0000-0000-000000000001',
      goalId: 'goal-uuid-here',
      name: 'Component Memoization',
      description: 'Deep mastery of useMemo, useCallback, and React.memo patterns.'
    },
    when_to_use: 'When breaking down a broad goal into measurable sub-skills. goalId must reference an existing goal.',
    relatedCapabilities: ['goal', 'link_knowledge']
  }),

  create_board: () => ({
    capability: 'create_board',
    endpoint: 'POST /api/gpt/create',
    description: 'Create a new purpose-typed think board.',
    schema: {
      type: 'board',
      userId: 'UUID from state (REQUIRED)',
      name: 'string (REQUIRED)',
      purpose: 'general | idea_planning | curriculum_review | lesson_plan | research_tracking | strategy',
      linkedEntityId: 'optional UUID',
      linkedEntityType: 'optional "goal" | "experience" | "knowledge"'
    },
    example: {
      type: 'board',
      userId: 'user-123',
      name: 'SaaS Launch Roadmap',
      purpose: 'strategy'
    },
    when_to_use: 'When you need a new spatial workspace for a specific topic or goal.'
  }),

  board_from_text: () => ({
    capability: 'board_from_text',
    endpoint: 'POST /api/gpt/create',
    description: 'AI-GEN: Generate a full board structure (nodes + edges) from a text prompt or conversation context.',
    schema: {
      type: 'board_from_text',
      userId: 'UUID from state (REQUIRED)',
      prompt: 'string (REQUIRED) — instructions for what should be on the map'
    },
    example: {
      type: 'board_from_text',
      userId: 'user-123',
      prompt: 'Map out the core concepts of Kubernetes for a beginner.'
    },
    when_to_use: 'When you want to bootstrap a large board quickly using AI instead of manual node creation.'
  }),

  create_map_node: () => ({
    capability: 'create_map_node',
    endpoint: 'POST /api/gpt/create',
    description: 'Add a new node to a mind map (think board). If boardId is omitted, it will use your default board.',
    schema: {
      type: 'map_node',
      userId: 'UUID from state',
      boardId: 'optional UUID of the think board',
      label: 'string (max 100)',
      description: 'optional string (short hover summary)',
      content: 'optional string (long-form elaboration — can be paragraphs)',
      color: 'optional string (hex or tailwind color name)',
      position_x: 'number',
      position_y: 'number'
    },
    example: {
      type: 'map_node',
      userId: 'a0000000-0000-0000-0000-000000000001',
      label: 'Frontend Performance',
      description: 'Core concepts for optimizing React apps.',
      color: '#3b82f6',
      position_x: 100,
      position_y: 100
    },
    when_to_use: 'When you want to visualize a concept as a node in a spatial mind map.'
  }),

  create_map_edge: () => ({
    capability: 'create_map_edge',
    endpoint: 'POST /api/gpt/create',
    description: 'Connect two mind map nodes with an edge.',
    schema: {
      type: 'map_edge',
      userId: 'UUID from state',
      boardId: 'optional UUID of the think board',
      sourceNodeId: 'UUID of source node',
      targetNodeId: 'UUID of target node'
    },
    example: {
      type: 'map_edge',
      userId: 'a0000000-0000-0000-0000-000000000001',
      sourceNodeId: 'node-uuid-1',
      targetNodeId: 'node-uuid-2'
    },
    when_to_use: 'When defining relationships between existing nodes on the canvas.'
  }),

  update_map_node: () => ({
    capability: 'update_map_node',
    endpoint: 'POST /api/gpt/update',
    description: 'Update the content or color of a mind map node.',
    schema: {
      action: 'update_map_node',
      nodeId: 'UUID of the node to update',
      label: 'optional string',
      description: 'optional string',
      content: 'optional string',
      color: 'optional string'
    },
    example: {
      action: 'update_map_node',
      nodeId: 'node-uuid-1',
      label: 'Updated Label',
      description: 'New longer description.'
    },
    when_to_use: 'When improving or refining a node on the mind map.'
  }),

  delete_map_node: () => ({
    capability: 'delete_map_node',
    endpoint: 'POST /api/gpt/update',
    description: 'Delete a node from a mind map.',
    schema: {
      action: 'delete_map_node',
      nodeId: 'UUID of the node to delete'
    },
    example: {
      action: 'delete_map_node',
      nodeId: 'node-uuid-1'
    },
    when_to_use: 'When pruning a mind map.'
  }),

  delete_map_edge: () => ({
    capability: 'delete_map_edge',
    endpoint: 'POST /api/gpt/update',
    description: 'Delete a relationship between nodes on a mind map.',
    schema: {
      action: 'delete_map_edge',
      edgeId: 'UUID of the edge to delete'
    },
    example: {
      action: 'delete_map_edge',
      edgeId: 'edge-uuid-1'
    },
    when_to_use: 'When pruning connections on a mind map.'
  }),
 
  create_map_cluster: () => ({
    capability: 'create_map_cluster',
    endpoint: 'POST /api/gpt/create',
    description: 'Create a central hub node and multiple child nodes connected to it in one operation. Radius-based layout is handled automatically.',
    schema: {
      type: 'map_cluster',
      userId: 'UUID from state',
      boardId: 'optional UUID of the think board',
      centerNode: {
        label: 'string (max 100)',
        description: 'optional string',
        content: 'optional string',
        color: 'optional string',
        position_x: 'number (center X)',
        position_y: 'number (center Y)'
      },
      childNodes: [
        {
          label: 'string',
          description: 'optional string',
          content: 'optional string',
          color: 'optional string'
        }
      ]
    },
    example: {
      type: 'map_cluster',
      userId: 'a0000000-0000-0000-0000-000000000001',
      centerNode: {
        label: 'SaaS Business Model',
        description: 'High level components of a SaaS company.',
        color: '#3b82f6',
        position_x: 0,
        position_y: 0
      },
      childNodes: [
        { label: 'Unit Economics', description: 'LTV, CAC, Churn' },
        { label: 'Product Development', description: 'Roadmap, Tech Stack' },
        { label: 'Go-To-Market', description: 'Sales, Marketing' }
      ]
    },
    when_to_use: 'When you want to expand a concept into multiple sub-topics at once. Highly efficient for building trees.'
  }),
 
  read_board: () => ({
    capability: 'read_board',
    endpoint: 'POST /api/gpt/plan',
    description: 'Fetch the full content (nodes and edges) of a think board (mind map). Use before updating or expanding a board.',
    schema: {
      action: 'read_board',
      boardId: 'UUID of the think board to read'
    },
    example: {
      action: 'read_board',
      boardId: 'board-uuid-123'
    },
    when_to_use: 'When you need to see the spatial arrangement of nodes and edges to decide where to add new branches.',
    relatedCapabilities: ['create_map_node', 'expand_board_branch', 'suggest_board_gaps']
  }),

  read_map: () => ({
    capability: 'read_map',
    endpoint: 'POST /api/gpt/plan',
    description: 'Legacy alias for read_board. Fetches full board content.',
    schema: { action: 'read_map', boardId: 'UUID' },
    example: { action: 'read_map', boardId: 'board-123' },
    when_to_use: 'Same as read_board (legacy name).'
  }),

  list_boards: () => ({
    capability: 'list_boards',
    endpoint: 'GET /api/gpt/discover?capability=list_boards',
    description: 'Fetch summaries of all active boards for the user.',
    schema: null,
    example: null,
    when_to_use: 'When you need to see what boards exist before selecting one to read or modify.'
  }),

  rename_board: () => ({
    capability: 'rename_board',
    endpoint: 'POST /api/gpt/update',
    description: 'Rename an existing think board.',
    schema: {
      action: 'rename_board',
      boardId: 'UUID (REQUIRED)',
      name: 'string (REQUIRED)'
    },
    example: {
      action: 'rename_board',
      boardId: 'board-123',
      name: 'Better Board Name'
    }
  }),

  archive_board: () => ({
    capability: 'archive_board',
    endpoint: 'POST /api/gpt/update',
    description: 'Archive a board (hides it from standard views).',
    schema: {
      action: 'archive_board',
      boardId: 'UUID (REQUIRED)'
    },
    example: {
      action: 'archive_board',
      boardId: 'board-123'
    }
  }),

  reparent_node: () => ({
    capability: 'reparent_node',
    endpoint: 'POST /api/gpt/update',
    description: 'Change the parent of a node by moving its incoming edge.',
    schema: {
      action: 'reparent_node',
      boardId: 'UUID (REQUIRED)',
      nodeId: 'UUID of node to move (REQUIRED)',
      sourceNodeId: 'UUID of the new parent (REQUIRED)'
    },
    example: {
      action: 'reparent_node',
      boardId: 'board-123',
      nodeId: 'node-child',
      sourceNodeId: 'node-new-parent'
    }
  }),

  expand_board_branch: () => ({
    capability: 'expand_board_branch',
    endpoint: 'POST /api/gpt/update',
    description: 'AI-GEN: Suggest and create additional nodes branching off a specific point.',
    schema: {
      action: 'expand_board_branch',
      boardId: 'UUID (REQUIRED)',
      nodeId: 'UUID of node to expand from (REQUIRED)',
      count: 'optional number (default 3)',
      depth: 'optional number (default 1)'
    },
    example: {
      action: 'expand_board_branch',
      boardId: 'board-123',
      nodeId: 'node-pm'
    }
  }),

  suggest_board_gaps: () => ({
    capability: 'suggest_board_gaps',
    endpoint: 'POST /api/gpt/plan',
    description: 'AI-GEN: Analyze current board state and suggest missing concepts or connections.',
    schema: {
      action: 'suggest_board_gaps',
      boardId: 'UUID (REQUIRED)'
    },
    example: {
      action: 'suggest_board_gaps',
      boardId: 'board-123'
    }
  }),

  assess_gaps: () => ({
    capability: 'assess_gaps',
    endpoint: 'POST /api/gpt/plan',
    description: 'Compare current user knowledge against a goal or outline to identify missing concepts.',
    schema: {
      action: 'assess_gaps',
      userId: 'UUID',
      goalId: 'optional UUID',
      outlineId: 'optional UUID'
    },
    example: {
      action: 'assess_gaps',
      userId: 'a0000000-0000-0000-0000-000000000001',
      goalId: 'goal-uuid-456'
    },
    when_to_use: 'When planning the next phase of a curriculum.',
    relatedCapabilities: ['create_outline', 'create_experience']
  }),

  update_step: () => ({
    capability: 'update_step',
    endpoint: 'POST /api/gpt/update',
    description: 'Update the title or payload of an existing step in an experience.',
    schema: {
      action: 'update_step',
      experienceId: 'UUID',
      stepId: 'UUID',
      updates: {
        title: 'optional string',
        payload: 'optional step_payload object'
      }
    },
    example: {
      action: 'update_step',
      experienceId: 'exp-123',
      stepId: 'step-456',
      updates: {
        title: 'New Lesson Title',
        payload: { sections: [{ heading: 'Updated', body: 'New content', type: 'text' }] }
      }
    },
    when_to_use: 'When refining a curriculum or correcting a step based on feedback.',
    relatedCapabilities: ['create_experience', 'reorder_steps']
  }),

  reorder_steps: () => ({
    capability: 'reorder_steps',
    endpoint: 'POST /api/gpt/update',
    description: 'Change the order of steps in an experience using a list of step IDs.',
    schema: {
      action: 'reorder_steps',
      experienceId: 'UUID',
      stepIds: 'string[] — ordered list of step IDs'
    },
    example: {
      action: 'reorder_steps',
      experienceId: 'exp-123',
      stepIds: ['step-2', 'step-1', 'step-3']
    },
    when_to_use: 'When adjusting the pedagogical flow of an experience.',
    relatedCapabilities: ['update_step', 'delete_step']
  }),

  delete_step: () => ({
    capability: 'delete_step',
    endpoint: 'POST /api/gpt/update',
    description: 'Permanently remove a step from an experience.',
    schema: {
      action: 'delete_step',
      experienceId: 'UUID',
      stepId: 'UUID'
    },
    example: {
      action: 'delete_step',
      experienceId: 'exp-123',
      stepId: 'step-456'
    },
    when_to_use: 'When pruning unnecessary content from a curriculum.',
    relatedCapabilities: ['update_step']
  }),

  transition: () => ({
    capability: 'transition',
    endpoint: 'POST /api/gpt/update',
    description: 'Transition an experience lifecycle status.',
    schema: {
      action: 'transition',
      experienceId: 'UUID',
      transitionAction: 'activate | complete | kill | revive | supersede'
    },
    example: {
      action: 'transition',
      experienceId: 'exp-123',
      transitionAction: 'complete'
    },
    when_to_use: 'When moving an experience through its development lifecycle.',
    relatedCapabilities: ['create_experience', 'create_ephemeral']
  }),

  link_knowledge: () => ({
    capability: 'link_knowledge',
    endpoint: 'POST /api/gpt/update',
    description: 'Link a knowledge unit to a skill domain or an experience step to provide pedagogical support.',
    schema: {
      action: 'link_knowledge',
      unitId: 'UUID of the knowledge unit (REQUIRED)',
      domainId: 'optional UUID of a skill domain to link to',
      experienceId: 'optional UUID of an experience to link to',
      stepId: 'optional UUID of a specific step to link to'
    },
    example: {
      action: 'link_knowledge',
      unitId: 'unit-abc',
      domainId: 'domain-xyz'
    },
    when_to_use: 'To populate skill areas or provide "pre-reading" for a specific step.',
    relatedCapabilities: ['create_knowledge', 'skill_domain']
  }),

  update_knowledge: () => ({
    capability: 'update_knowledge',
    endpoint: 'POST /api/gpt/update',
    description: 'Update the content or attributes of an existing knowledge unit.',
    schema: {
      action: 'update_knowledge',
      unitId: 'UUID (REQUIRED)',
      updates: 'object matching create_knowledge schema'
    },
    example: {
      action: 'update_knowledge',
      unitId: 'unit-abc',
      updates: { title: 'Updated Title', content: 'New content here...' }
    },
    when_to_use: 'When refining persistent knowledge based on new research.',
    relatedCapabilities: ['create_knowledge', 'link_knowledge']
  }),

  update_skill_domain: () => ({
    capability: 'update_skill_domain',
    endpoint: 'POST /api/gpt/update',
    description: 'Update a skill domain description or linked entities.',
    schema: {
      action: 'update_skill_domain',
      domainId: 'UUID (REQUIRED)',
      updates: {
        description: 'optional string',
        linkedUnitIds: 'optional string[]',
        linkedExperienceIds: 'optional string[]'
      }
    },
    example: {
      action: 'update_skill_domain',
      domainId: 'domain-xyz',
      updates: { description: 'Mastery of advanced React patterns.' }
    },
    when_to_use: 'When refining the structure of a goal\'s proficiency tree.',
    relatedCapabilities: ['skill_domain', 'link_knowledge']
  }),

  transition_goal: () => ({
    capability: 'transition_goal',
    endpoint: 'POST /api/gpt/update',
    description: 'Transition a long-term goal through its lifecycle (activate, pause, complete, kill).',
    schema: {
      action: 'transition_goal',
      goalId: 'UUID (REQUIRED)',
      transitionAction: 'activate | pause | complete | kill | revive'
    },
    example: {
      action: 'transition_goal',
      goalId: 'goal-123',
      transitionAction: 'activate'
    },
    when_to_use: 'When the user starts, pauses, or completes a broad goal.',
    relatedCapabilities: ['goal', 'skill_domain']
  }),

  memory_record: () => ({
    capability: 'memory_record',
    endpoint: 'POST /api/gpt/create',
    description: 'Record a persistent agent memory. Match content + topic + kind to dedup and boost confidence.',
    schema: {
      type: 'memory',
      userId: 'UUID from state (REQUIRED)',
      kind: 'observation | strategy | idea | preference | tactic | assessment | note (REQUIRED)',
      topic: 'string (REQUIRED)',
      content: 'string (REQUIRED)',
      tags: 'optional string[]',
      pinned: 'optional boolean',
      confidence: 'optional number (0-1)'
    },
    example: {
      type: 'memory',
      userId: 'a0000000-0000-0000-0000-000000000001',
      kind: 'preference',
      topic: 'Product Management',
      content: 'User prefers "RICE" over "MoSCoW" for feature prioritization.',
      tags: ['prioritization', 'frameworks'],
      pinned: true
    },
    when_to_use: 'When you learn something about the user, their goals, or their world that should persist across all future conversations.',
    relatedCapabilities: ['memory_read', 'memory_correct']
  }),

  memory_read: () => ({
    capability: 'memory_read',
    endpoint: 'GET /api/gpt/memory',
    description: 'Query recorded memories with filters. Use substring match in query for keyword search.',
    schema: {
      userId: 'UUID from state',
      kind: 'optional kind',
      topic: 'optional topic',
      query: 'optional search string',
      limit: 'optional number'
    },
    example: {
      userId: 'user-123',
      query: 'prioritization'
    },
    when_to_use: 'When you need to recall specific past observations or strategies to inform the current task.',
    relatedCapabilities: ['memory_record', 'memory_correct', 'consolidate_memory']
  }),

  memory_correct: () => ({
    capability: 'memory_correct',
    endpoint: 'POST /api/gpt/update',
    description: 'Update or delete a memory entry. Use action="delete_memory" for removal.',
    schema: {
      action: 'memory_update | memory_delete',
      memoryId: 'UUID (REQUIRED)',
      updates: {
        content: 'optional string',
        topic: 'optional string',
        pinned: 'optional boolean',
        tags: 'optional string[]'
      }
    },
    example: {
      action: 'memory_update',
      memoryId: 'mem-123',
      updates: { pinned: true }
    },
    when_to_use: 'When a memory is incorrect, outdated, or needs to be elevated (pinned).',
    relatedCapabilities: ['memory_read']
  }),

  consolidate_memory: () => ({
    capability: 'consolidate_memory',
    endpoint: 'POST /api/gpt/update',
    description: 'Automated background task to extract memories from recent interactions and experiences.',
    schema: {
      action: 'consolidate_memory',
      userId: 'UUID from state (REQUIRED)',
      lookbackHours: 'optional number (default 24)'
    },
    example: {
      action: 'consolidate_memory',
      userId: 'user-123'
    },
    when_to_use: 'Periodically or after a major milestone to ensure the "Notebook" memory layer is up to date.'
  })
};


/**
 * Returns capability details from the registry.
 */
export function getCapability(name: DiscoverCapability, params?: Record<string, any>): DiscoverResponse {
  const handler = REGISTRY[name];
  if (!handler) {
    throw new Error(`Capability "${name}" not found in registry.`);
  }
  
  // Custom response for templates since it needs real constants
  if (name === 'templates') {
    const base = handler(params);
    return {
      ...base,
      schema: {
        templateId: [
          { id: DEFAULT_TEMPLATE_IDS.questionnaire, class: 'questionnaire', use_for: 'Surveys and intake' },
          { id: DEFAULT_TEMPLATE_IDS.lesson, class: 'lesson', use_for: 'Core content delivery' },
          { id: DEFAULT_TEMPLATE_IDS.challenge, class: 'challenge', use_for: 'Active practice and exercises' },
          { id: DEFAULT_TEMPLATE_IDS.plan_builder, class: 'plan_builder', use_for: 'Action planning' },
          { id: DEFAULT_TEMPLATE_IDS.reflection, class: 'reflection', use_for: 'Post-action summary' },
          { id: DEFAULT_TEMPLATE_IDS.essay_tasks, class: 'essay_tasks', use_for: 'Writing and research' }
        ]
      }
    };
  }

  return handler(params);
}

/**
 * Returns all available capability names.
 */
export function getAvailableCapabilities(): string[] {
  return Object.keys(REGISTRY);
}

```

### lib/gateway/gateway-router.ts

```typescript
import { 
  createExperienceInstance, 
  injectEphemeralExperience, 
  addStep, 
  updateExperienceStep, 
  reorderExperienceSteps, 
  deleteExperienceStep, 
  transitionExperienceStatus,
  ExperienceStep
} from '@/lib/services/experience-service';
import { createIdea } from '@/lib/services/ideas-service';
import { createKnowledgeUnit } from '@/lib/services/knowledge-service';
import { createSkillDomain } from '@/lib/services/skill-domain-service';

// Note: Lane 4 builds this service. We import it to ensure we provide the link_knowledge capability.
// If it fails to import (e.g. file doesn't exist yet), it will be a TSC error later which Lane 2 or 7 will fix.
import { linkStepToKnowledge } from '@/lib/services/step-knowledge-link-service'; 
import { recordMemory, updateMemory, deleteMemory, consolidateMemory } from '@/lib/services/agent-memory-service';
import { runFlowSafe } from '@/lib/ai/safe-flow';
import { boardFromTextFlow, expandBranchFlow, suggestGapsFlow } from '@/lib/ai/flows/board-macros';

/**
 * Dispatches creation requests to the appropriate services.
 */
export async function dispatchCreate(type: string, payload: any) {
  switch (type) {
    case 'experience': {
      // Normalize camelCase GPT payload → snake_case ExperienceInstance
      const instanceData: any = {
        user_id: payload.userId ?? payload.user_id,
        template_id: payload.templateId ?? payload.template_id,
        title: payload.title ?? 'Untitled Experience',
        goal: payload.goal ?? '',
        instance_type: 'persistent' as const,
        status: 'proposed' as const,
        resolution: payload.resolution,
        reentry: payload.reentry ?? null,
        idea_id: payload.ideaId ?? payload.idea_id ?? null,
        previous_experience_id: payload.previousExperienceId ?? payload.previous_experience_id ?? null,
        next_suggested_ids: [],
        friction_level: null,
        source_conversation_id: payload.source_conversation_id ?? null,
        generated_by: payload.generated_by ?? 'gpt',
        realization_id: null,
        published_at: null,
        curriculum_outline_id: payload.curriculum_outline_id ?? null,
      };

      if (!instanceData.resolution) {
        throw new Error('Resolution is required. Call GET /api/gpt/discover?capability=resolution for valid values.');
      }
      if (!instanceData.template_id) {
        throw new Error('templateId is required. Call GET /api/gpt/discover?capability=templates for valid IDs.');
      }
      if (!instanceData.user_id) {
        throw new Error('userId is required.');
      }

      const newInstance = await createExperienceInstance(instanceData);
      const createdSteps: ExperienceStep[] = [];

      // Create inline steps if provided
      if (payload.steps && Array.isArray(payload.steps)) {
        for (let i = 0; i < payload.steps.length; i++) {
          const step = payload.steps[i];
          const st = step.step_type ?? step.stepType ?? step.type;
          if (!st || st === 'step') continue;
          
          const { type: _tp, step_type: _st, stepType: _stc, title, payload: nestedPayload, completion_rule, ...rest } = step;
          const createdStep = await addStep(newInstance.id, {
            step_type: st,
            title: title ?? '',
            payload: nestedPayload ?? rest,
            completion_rule: completion_rule ?? null,
          });
          createdSteps.push(createdStep);
        }
      }

      if (instanceData.previous_experience_id) {
        const { linkExperiences } = await import('@/lib/services/graph-service');
        await linkExperiences(instanceData.previous_experience_id, newInstance.id, 'chain');
      }
      const stepsResponse = createdSteps.map(s => ({
        ...s,
        order_index: s.step_order
      }));

      return { ...newInstance, steps: stepsResponse };
    }
    case 'ephemeral':
      return injectEphemeralExperience(payload);
    case 'idea':
      return createIdea(payload);
    case 'goal': {
      const { createGoal } = await import('@/lib/services/goal-service');
      const goal = await createGoal(payload);
      // Auto-create skill domains from the domains array (best-effort, won't fail the goal)
      if (payload.domains && Array.isArray(payload.domains)) {
        const domainResults: string[] = [];
        try {
          const { createSkillDomain: createDomain } = await import('@/lib/services/skill-domain-service');
          for (const domainName of payload.domains) {
            try {
              await createDomain({
                userId: goal.userId,
                goalId: goal.id,
                name: domainName,
                description: '',
                linkedUnitIds: [],
                linkedExperienceIds: []
              });
              domainResults.push(domainName);
            } catch (innerErr: any) {
              console.warn(`[gateway/create] Skill domain "${domainName}" failed:`, innerErr.message);
            }
          }
        } catch (err) {
          console.warn('[gateway/create] Skill domain service unavailable:', err);
        }
        return { ...goal, _domainsCreated: domainResults };
      }
      return goal;
    }
    case 'step': {
      if (!payload.experienceId && !payload.instanceId) {
        throw new Error('Missing experienceId (or instanceId) for step creation');
      }
      const st = payload.step_type ?? payload.stepType ?? payload.type;
      if (!st || st === 'step') {
        throw new Error('Missing explicit step_type (e.g. lesson, challenge, checkpoint) for step creation');
      }

      // SOP-41: Filter metadata out of step payload to prevent pollution
      const STEP_CONTENT_KEYS: Record<string, string[]> = {
        lesson: ['sections'],
        challenge: ['objectives'],
        checkpoint: ['questions', 'knowledge_unit_id', 'passing_threshold', 'on_fail'],
        reflection: ['prompts'],
        questionnaire: ['questions'],
        essay_tasks: ['content', 'tasks'],
        plan_builder: ['sections'],
      };
      
      const { 
        type: _tp, 
        experienceId, 
        instanceId, 
        step_type: _st, 
        stepType: _stc, 
        title, 
        payload: nestedPayload, 
        completion_rule, 
        ...rest 
      } = payload;

      const contentKeys = STEP_CONTENT_KEYS[st] || [];
      const stepPayload: any = nestedPayload && Object.keys(nestedPayload).length > 0 ? { ...nestedPayload } : {};
      
      if (!nestedPayload || Object.keys(nestedPayload).length === 0) {
        for (const key of contentKeys) {
          if (rest[key] !== undefined) {
            stepPayload[key] = rest[key];
          }
        }
      }
      
      return addStep(payload.experienceId ?? payload.instanceId, {
        step_type: st,
        title: title ?? '',
        payload: stepPayload,
        completion_rule: completion_rule ?? null
      });
    }
    case 'knowledge': {
      const { createKnowledgeUnit } = await import('@/lib/services/knowledge-service');
      // Normalize camelCase GPT payload → snake_case KnowledgeUnit
      const knowledgeData: any = {
        ...payload,
        user_id: payload.userId ?? payload.user_id,
        unit_type: payload.unitType ?? payload.unit_type,
        key_ideas: payload.keyIdeas ?? payload.key_ideas,
        common_mistake: payload.commonMistake ?? payload.common_mistake,
        action_prompt: payload.actionPrompt ?? payload.action_prompt,
        retrieval_questions: payload.retrievalQuestions ?? payload.retrieval_questions,
        linked_experience_ids: payload.linkedExperienceIds ?? payload.linked_experience_ids,
        source_experience_id: payload.sourceExperienceId ?? payload.source_experience_id,
        subtopic_seeds: payload.subtopicSeeds ?? payload.subtopic_seeds,
        mastery_status: payload.masteryStatus ?? payload.mastery_status,
      };
      
      if (!knowledgeData.user_id) {
        throw new Error('userId is required for knowledge creation.');
      }
      
      return createKnowledgeUnit(knowledgeData);
    }
    case 'skill_domain': {
      if (!payload.userId && !payload.user_id) {
        throw new Error('Missing userId for skill_domain creation.');
      }
      if (!payload.goalId && !payload.goal_id) {
        throw new Error('Missing goalId for skill_domain creation. Create a goal first via type="goal".');
      }
      if (!payload.name) {
        throw new Error('Missing name for skill_domain creation.');
      }
      return createSkillDomain({
        userId: payload.userId ?? payload.user_id,
        goalId: payload.goalId ?? payload.goal_id,
        name: payload.name,
        description: payload.description ?? '',
        linkedUnitIds: payload.linkedUnitIds ?? [],
        linkedExperienceIds: payload.linkedExperienceIds ?? [],
      });
    }
    case 'map_node': {
      const { createNode, getBoards, createBoard } = await import('@/lib/services/mind-map-service');
      let boardId = payload.boardId;
      if (!boardId) {
        const boards = await getBoards(payload.userId);
        if (boards.length > 0) {
          boardId = boards[0].id;
        } else {
          const newBoard = await createBoard(payload.userId, 'Default Board');
          boardId = newBoard.id;
        }
      }
      return createNode(payload.userId, boardId, {
        label: payload.label,
        description: payload.description,
        content: payload.content,
        color: payload.color,
        positionX: payload.position_x,
        positionY: payload.position_y,
        nodeType: 'ai_generated'
      });
    }
    case 'map_edge': {
      const { createEdge, getBoards, createBoard } = await import('@/lib/services/mind-map-service');
      let edgeBoardId = payload.boardId;
      if (!edgeBoardId) {
        const boards = await getBoards(payload.userId);
        if (boards.length > 0) {
          edgeBoardId = boards[0].id;
        } else {
          const newBoard = await createBoard(payload.userId, 'Default Board');
          edgeBoardId = newBoard.id;
        }
      }
      return createEdge(edgeBoardId, payload.sourceNodeId, payload.targetNodeId);
    }
    case 'map_cluster': {
      const { createNode, createEdge, getBoards, createBoard } = await import('@/lib/services/mind-map-service');
      const { userId, boardId: providedBoardId, centerNode, childNodes } = payload;
      
      let boardId = providedBoardId;
      if (!boardId) {
        const boards = await getBoards(userId);
        if (boards.length > 0) {
          boardId = boards[0].id;
        } else {
          const newBoard = await createBoard(userId, 'Default Board');
          boardId = newBoard.id;
        }
      }

      // 1. Create center node
      const center = await createNode(userId, boardId, {
        label: centerNode.label,
        description: centerNode.description,
        content: centerNode.content,
        color: centerNode.color,
        positionX: centerNode.position_x ?? 0,
        positionY: centerNode.position_y ?? 0,
        nodeType: 'ai_generated'
      });

      // 2. Create child nodes with radial layout
      const radius = 180; // Optimized spacing
      const createdChildren = [];
      const createdEdges = [];

      if (childNodes && Array.isArray(childNodes)) {
        const count = childNodes.length;
        for (let i = 0; i < count; i++) {
          const child = childNodes[i];
          const angle = (2 * Math.PI * i) / count;
          const x = (center.positionX ?? 0) + radius * Math.cos(angle);
          const y = (center.positionY ?? 0) + radius * Math.sin(angle);

          const newChild = await createNode(userId, boardId, {
            label: child.label,
            description: child.description,
            content: child.content,
            color: child.color,
            positionX: x,
            positionY: y,
            nodeType: 'ai_generated',
            parentNodeId: center.id
          });

          // 3. Auto-link edge from center to child
          const edge = await createEdge(boardId, center.id, newChild.id);
          
          createdChildren.push(newChild);
          createdEdges.push(edge);
        }
      }

      return {
        center,
        children: createdChildren,
        edges: createdEdges
      };
    }
    case 'memory': {
      return recordMemory({
        userId: payload.userId ?? payload.user_id,
        kind: payload.kind,
        topic: payload.topic,
        content: payload.content,
        memoryClass: payload.memoryClass ?? payload.memory_class ?? 'semantic',
        tags: payload.tags ?? [],
        metadata: payload.metadata ?? {},
        source: 'gpt_learned'
      });
    }
    case 'board': {
      const { createBoard } = await import('@/lib/services/mind-map-service');
      return createBoard(
        payload.userId ?? payload.user_id,
        payload.name || 'New Board',
        payload.purpose || 'general',
        payload.linkedEntityId || null,
        payload.linkedEntityType || null
      );
    }
    case 'board_from_text': {
      return runFlowSafe(boardFromTextFlow, {
        prompt: payload.prompt,
        userId: payload.userId ?? payload.user_id
      }, async (output: any) => {
        if (!output || output.error) return output;
        const { createBoard, createNode, createEdge } = await import('@/lib/services/mind-map-service');
        const board = await createBoard(payload.userId ?? payload.user_id, output.title, 'general');
        
        const nodeMap: Record<string, string> = {};
        
        // Create root node first if exists
        const rootNodeData = (output.nodes as any[]).find((n: any) => n.type === 'root');
        if (rootNodeData) {
          const rootNode = await createNode(payload.userId ?? payload.user_id, board.id, {
            label: rootNodeData.label,
            description: rootNodeData.description,
            content: rootNodeData.content,
            color: rootNodeData.color,
            positionX: rootNodeData.x,
            positionY: rootNodeData.y,
            nodeType: 'root'
          });
          nodeMap[rootNodeData.label] = rootNode.id;
        }

        // Create other nodes
        for (const n of (output.nodes as any[]).filter(n => n.type !== 'root')) {
          const node = await createNode(payload.userId ?? payload.user_id, board.id, {
            label: n.label,
            description: n.description,
            content: n.content,
            color: n.color,
            positionX: n.x,
            positionY: n.y,
            nodeType: 'ai_generated'
          });
          nodeMap[n.label] = node.id;
        }

        // Create edges based on parentLabel
        const edges: any[] = [];
        for (const n of (output.nodes as any[])) {
          if (n.parentLabel && nodeMap[n.parentLabel] && nodeMap[n.label]) {
            const edge = await createEdge(board.id, nodeMap[n.parentLabel], nodeMap[n.label]);
            edges.push(edge);
          }
        }

        return { ...board, nodesCreated: output.nodes.length, edgesCreated: edges.length };
      });
    }
    default:
      throw new Error(`Unknown create type: "${type}"`);
  }
}

/**
 * Dispatches update requests to the appropriate services.
 */
export async function dispatchUpdate(action: string, payload: any) {
  switch (action) {
    case 'update_step': {
      if (!payload.stepId) throw new Error('Missing stepId');
      const updates = payload.stepPayload ?? payload.updates ?? {};
      
      const columnFields = ['title', 'step_type', 'step_order', 'status', 'completion_rule', 'scheduled_date', 'due_date', 'estimated_minutes'];
      const topLevel: any = {};
      const payloadUpdates: any = {};
      
      Object.keys(updates).forEach(key => {
        if (columnFields.includes(key)) {
          topLevel[key] = updates[key];
        } else {
          payloadUpdates[key] = updates[key];
        }
      });
      
      // If there are payload updates, wrap them
      if (Object.keys(payloadUpdates).length > 0) {
        topLevel.payload = payloadUpdates;
      }
      
      return updateExperienceStep(payload.stepId, topLevel);
    }
    
    case 'reorder_steps':
      if (!payload.experienceId || !payload.orderedIds) {
        throw new Error('Missing experienceId or orderedIds');
      }
      return reorderExperienceSteps(payload.experienceId, payload.orderedIds);
    
    case 'delete_step':
      if (!payload.stepId) throw new Error('Missing stepId');
      return deleteExperienceStep(payload.stepId);
    
    case 'transition':
      if (!payload.experienceId || !payload.transitionAction) {
        throw new Error('Missing experienceId or transitionAction');
      }
      return transitionExperienceStatus(payload.experienceId, payload.transitionAction);
    
    case 'link_knowledge':
      if (!payload.stepId || !payload.knowledgeUnitId) {
        throw new Error('Missing stepId or knowledgeUnitId');
      }
      return linkStepToKnowledge(payload.stepId, payload.knowledgeUnitId, payload.linkType || 'teaches');

    case 'update_knowledge':
      if (!payload.unitId) throw new Error('Missing unitId for knowledge update');
      if (payload.mastery_status) {
        const { updateMasteryStatus } = await import('@/lib/services/knowledge-service');
        return updateMasteryStatus(payload.userId, payload.unitId, payload.mastery_status);
      }
      const { enrichKnowledgeUnit } = await import('@/lib/services/knowledge-service');
      return enrichKnowledgeUnit(payload.unitId, payload.updates);

    case 'update_skill_domain':
      if (!payload.domainId) throw new Error('Missing domainId for skill domain update');
      const { updateSkillDomain, linkKnowledgeUnit, linkExperience } = await import('@/lib/services/skill-domain-service');
      
      if (payload.action === 'link_unit') {
        return linkKnowledgeUnit(payload.domainId, payload.unitId);
      }
      if (payload.action === 'link_experience') {
        return linkExperience(payload.domainId, payload.experienceId);
      }
      if (payload.action === 'recompute_mastery') {
        const { updateDomainMastery } = await import('@/lib/experience/skill-mastery-engine');
        const { getSkillDomain } = await import('@/lib/services/skill-domain-service');
        const domain = await getSkillDomain(payload.domainId);
        if (!domain) throw new Error('Skill domain not found');
        return updateDomainMastery(domain.goalId, payload.domainId);
      }
      return updateSkillDomain(payload.domainId, payload.updates);
    case 'update_map_node':
      if (!payload.nodeId) throw new Error('Missing nodeId');
      const { updateNode } = await import('@/lib/services/mind-map-service');
      return updateNode(payload.nodeId, {
        label: payload.label,
        description: payload.description,
        content: payload.content,
        color: payload.color,
        nodeType: payload.nodeType,
        metadata: payload.metadata,
      });

    case 'delete_map_node':
      if (!payload.nodeId) throw new Error('Missing nodeId');
      const { deleteNode } = await import('@/lib/services/mind-map-service');
      return deleteNode(payload.nodeId);

    case 'delete_map_edge':
      if (!payload.edgeId) throw new Error('Missing edgeId');
      const { deleteEdge } = await import('@/lib/services/mind-map-service');
      return deleteEdge(payload.edgeId);

    case 'transition_goal': {
      if (!payload.goalId) throw new Error('Missing goalId for goal transition');
      if (!payload.transitionAction) throw new Error('Missing transitionAction for goal transition (e.g. activate, pause, complete, archive)');
      const { transitionGoalStatus } = await import('@/lib/services/goal-service');
      return transitionGoalStatus(payload.goalId, payload.transitionAction);
    }

    case 'memory_update': {
      if (!payload.memoryId) throw new Error('Missing memoryId');
      return updateMemory(payload.memoryId, payload.updates);
    }
    case 'memory_delete': {
      if (!payload.memoryId) throw new Error('Missing memoryId');
      await deleteMemory(payload.memoryId);
      return { success: true };
    }
    case 'consolidate_memory': {
      return consolidateMemory(payload.userId ?? payload.user_id, payload.lookbackHours ?? 24);
    }

    case 'rename_board': {
      if (!payload.boardId || !payload.name) throw new Error('Missing boardId or name');
      const { updateBoard } = await import('@/lib/services/mind-map-service');
      return updateBoard(payload.boardId, { name: payload.name });
    }

    case 'archive_board': {
      if (!payload.boardId) throw new Error('Missing boardId');
      const { updateBoard } = await import('@/lib/services/mind-map-service');
      return updateBoard(payload.boardId, { isArchived: true });
    }

    case 'reparent_node': {
      if (!payload.nodeId || !payload.sourceNodeId) throw new Error('Missing nodeId or sourceNodeId');
      const { getBoardGraph, deleteEdge, createEdge } = await import('@/lib/services/mind-map-service');
      
      // Lock 4: reparent is EDGE-BASED
      const boardId = payload.boardId;
      if (!boardId) throw new Error('Missing boardId for reparenting');
      
      const { edges } = await getBoardGraph(boardId);
      const incomingEdges = edges.filter(e => e.targetNodeId === payload.nodeId);
      
      for (const edge of incomingEdges) {
        await deleteEdge(edge.id);
      }
      
      return createEdge(boardId, payload.sourceNodeId, payload.nodeId);
    }

    case 'expand_board_branch': {
      return runFlowSafe(expandBranchFlow, payload, async (output: any) => {
        if (!output || output.error) return output;
        const { createNode, createEdge } = await import('@/lib/services/mind-map-service');
        const results = [];
        for (const n of (output.nodes as any[])) {
          const node = await createNode(payload.userId ?? payload.user_id, payload.boardId, {
            ...n,
            nodeType: 'ai_generated'
          });
          if (n.parentNodeId) {
            await createEdge(payload.boardId, n.parentNodeId, node.id);
          }
          results.push(node);
        }
        return results;
      });
    }

    case 'suggest_board_gaps': {
      return runFlowSafe(suggestGapsFlow, payload);
    }

    default:
      throw new Error(`Unknown update action: "${action}"`);
  }
}

/**
 * Dispatches planning and retrieval requests.
 */
export async function dispatchPlan(action: string, payload: any) {
  switch (action) {
    case 'list_boards': {
      const { getBoardSummaries } = await import('@/lib/services/mind-map-service');
      return getBoardSummaries(payload.userId ?? payload.user_id);
    }
    case 'read_board': {
      const { getBoardGraph, getBoards } = await import('@/lib/services/mind-map-service');
      const boards = await getBoards(payload.userId ?? payload.user_id);
      const board = boards.find(b => b.id === payload.boardId);
      if (!board) throw new Error(`Board ${payload.boardId} not found`);
      
      const graph = await getBoardGraph(payload.boardId);
      return {
        ...board,
        ...graph
      };
    }
    default:
      throw new Error(`Unknown plan action: "${action}"`);
  }
}

```

### lib/gateway/gateway-types.ts

```typescript
// lib/gateway/gateway-types.ts

/**
 * Union of all capabilities that the GPT can discover via GET /api/gpt/discover.
 */
export type DiscoverCapability = 
  | 'templates'
  | 'create_experience'
  | 'create_ephemeral'
  | 'create_idea'
  | 'step_payload'
  | 'resolution'
  | 'create_outline'
  | 'dispatch_research'
  | 'goal'
  | 'tutor_chat'
  | 'grade_checkpoint'
  | 'create_knowledge'
  | 'skill_domain'
  | 'create_map_node'
  | 'create_map_edge'
  | 'create_map_cluster'
  | 'update_map_node'
  | 'delete_map_node'
  | 'delete_map_edge'
  | 'read_map'
  | 'assess_gaps'
  | 'update_step'
  | 'reorder_steps'
  | 'delete_step'
  | 'transition'
  | 'link_knowledge'
  | 'update_knowledge'
  | 'update_skill_domain'
  | 'transition_goal'
  | 'memory_record'
  | 'memory_read'
  | 'memory_correct'
  | 'consolidate_memory'
  | 'create_board'
  | 'board_from_text'
  | 'list_boards'
  | 'read_map'
  | 'read_board'
  | 'rename_board'
  | 'archive_board'
  | 'reparent_node'
  | 'expand_board_branch'
  | 'suggest_board_gaps';


/**
 * Response shape for the discovery endpoint.
 * Provides the schema and example needed for GPT to correctly call gateway endpoints.
 */
export interface DiscoverResponse {
  capability: DiscoverCapability;
  endpoint: string;
  description: string;
  schema: any;
  example: any;
  /** When to use this capability instead of others */
  when_to_use?: string;
  /** Contextually relevant capabilities to explore next */
  relatedCapabilities?: string[];
}

/**
 * Common request shape for all POST gateway endpoints.
 * Discriminated by 'type' (for /create) or 'action' (for /update or /plan).
 */
export interface GatewayRequest {
  type?: string;
  action?: string;
  payload: Record<string, any>;
}

```

### lib/github/client.ts

```typescript
import { Octokit } from '@octokit/rest'

let _client: Octokit | null = null

/**
 * Returns the singleton Octokit client, initialised from GITHUB_TOKEN.
 * Throws if the token is not set.
 *
 * Future: this becomes the boundary for GitHub App auth.
 * export function getGitHubClientForInstallation(installationId: number): Octokit { ... }
 */
export function getGitHubClient(): Octokit {
  if (!_client) {
    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error('GITHUB_TOKEN is not set')
    _client = new Octokit({ auth: token })
  }
  return _client
}

```

### lib/github/handlers/handle-issue-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getProjects, updateProjectState } from '@/lib/services/projects-service'
import { createInboxEvent } from '@/lib/services/inbox-service'

export async function handleIssueEvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload } = ctx
  const issue = rawPayload.issue as any
  if (!issue) return

  const issueNumber = issue.number
  const projects = await getProjects()
  const project = projects.find((p) => p.githubIssueNumber === issueNumber)

  if (!project) {
    console.log(`[webhook/github] No local project found for issue #${issueNumber}`)
    return
  }

  console.log(`[webhook/github] Handling issue.${action} for project ${project.id}`)

  switch (action) {
    case 'opened':
    case 'reopened':
      // Status remains 'arena' or similar, but maybe log it
      await createInboxEvent({
        type: 'github_issue_created',
        title: `GitHub Issue #${issueNumber} ${action}`,
        body: `Issue "${issue.title}" was ${action} on GitHub.`,
        severity: 'info',
        projectId: project.id,
        actionUrl: `/arena/${project.id}`
      })
      break

    case 'closed':
      // If we use issue closure as a signal for project status, update it.
      // For now, just create an inbox event.
      await createInboxEvent({
        type: 'project_shipped', // mapped loosely
        title: `GitHub Issue #${issueNumber} closed`,
        body: `The linked issue for "${project.name}" was closed.`,
        severity: 'success',
        projectId: project.id
      })
      break

    case 'assigned':
      const assignee = (rawPayload.assignee as any)?.login
      if (assignee) {
        await createInboxEvent({
          type: 'github_copilot_assigned',
          title: 'Developer assigned',
          body: `${assignee} was assigned to issue #${issueNumber}.`,
          severity: 'info',
          projectId: project.id
        })
      }
      break

    default:
      console.log(`[webhook/github] Action ${action} for issue ${issueNumber} not specifically handled.`)
  }
}

```

### lib/github/handlers/handle-pr-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getProjects } from '@/lib/services/projects-service'
import { createPR, updatePR, getPRsForProject } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { PullRequest } from '@/types/pr'
import type { InboxEventType } from '@/types/inbox'

export async function handlePREvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload, repositoryFullName } = ctx
  const pr = rawPayload.pull_request as any
  if (!pr) return

  console.log(`[webhook/github] Handling pull_request.${action} for PR #${pr.number} in ${repositoryFullName}`)

  // Search for the project this PR belongs to
  const projects = await getProjects()
  
  // Try to find the project by repo name first.
  // Then try to refine by looking for the issue number in the PR body (e.g., "Fixes #123")
  const repoProjects = projects.filter(
    (p) => 
      (p.githubRepoFullName === repositoryFullName) || 
      (p.githubRepo && repositoryFullName.endsWith(p.githubRepo))
  )

  let project = repoProjects.find(p => {
    const issueNumStr = p.githubIssueNumber?.toString()
    return pr.body?.includes(`#${issueNumStr}`) || pr.title?.includes(`#${issueNumStr}`)
  })
  
  // Fallback: if there's only one active project in the repo, assume it's that one
  if (!project && repoProjects.length === 1) {
    project = repoProjects[0]
  }

  if (!project) {
    console.log(`[webhook/github] PR #${pr.number} could not be accurately linked to a local project.`)
    return
  }

  const existingPRs = await getPRsForProject(project.id)
  const existingPR = existingPRs.find((p: PullRequest) => p.number === pr.number)

  switch (action) {
    case 'opened':
    case 'reopened':
    case 'ready_for_review':
      if (existingPR) {
        await updatePR(existingPR.id, {
          status: pr.state === 'open' ? 'open' : (pr.merged ? 'merged' : 'closed'),
          title: pr.title,
          branch: pr.head.ref,
          author: pr.user.login,
          mergeable: pr.mergeable ?? true,
        })
      } else {
        const newPR = await createPR({
          projectId: project.id,
          title: pr.title,
          branch: pr.head.ref,
          status: 'open',
          author: pr.user.login,
          buildState: 'pending',
          mergeable: pr.mergeable ?? true,
          previewUrl: '', // To be updated by deployment webhooks
        })
        await updatePR(newPR.id, { number: pr.number })
      }

      await createInboxEvent({
        type: 'github_pr_opened' as InboxEventType,
        title: `PR #${pr.number} ${action}`,
        body: `New pull request "${pr.title}" for project "${project.name}".`,
        severity: 'info',
        projectId: project.id,
        actionUrl: `/review/${pr.number}` // Or however the review page is keyed
      })
      break

    case 'closed':
      if (existingPR) {
        const isMerged = pr.merged === true
        await updatePR(existingPR.id, {
          status: isMerged ? 'merged' : 'closed',
          mergeable: false,
        })

        await createInboxEvent({
          type: isMerged ? 'github_pr_merged' : 'project_killed',
          title: `PR #${pr.number} ${isMerged ? 'merged' : 'closed'}`,
          body: `Pull request "${pr.title}" was ${isMerged ? 'merged' : 'closed without merging'}.`,
          severity: isMerged ? 'success' : 'warning',
          projectId: project.id
        })
      }
      break

    case 'synchronize':
      if (existingPR) {
        await updatePR(existingPR.id, {
          buildState: 'running', // Assume a new build starts on synchronize
        })
      }
      break

    default:
      console.log(`[webhook/github] PR action ${action} not explicitly handled.`)
  }
}

```

### lib/github/handlers/handle-pr-review-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getPRsForProject } from '@/lib/services/prs-service'
import { updatePR } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { getProjects } from '@/lib/services/projects-service'
import type { ReviewStatus } from '@/types/pr'

export async function handlePRReviewEvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload } = ctx
  const pr = rawPayload.pull_request as any
  const review = rawPayload.review as any
  if (!pr || !review) return

  const prNumber = pr.number
  console.log(`[webhook/github] Handling pull_request_review.${action} for PR #${prNumber}`)

  // Find local PR by number — search across all projects
  const projects = await getProjects()
  let localPR = null
  for (const project of projects) {
    const prs = await getPRsForProject(project.id)
    const found = prs.find((p) => p.number === prNumber)
    if (found) { localPR = found; break }
  }

  if (!localPR) {
    console.log(`[webhook/github] No local PR found for number ${prNumber}`)
    return
  }

  switch (action) {
    case 'submitted':
      const reviewState = review.state.toLowerCase()
      let reviewStatus: ReviewStatus = 'pending'
      let eventType: 'github_pr_opened' | 'github_changes_requested' | 'github_review_requested' = 'github_review_requested'

      if (reviewState === 'approved') {
        reviewStatus = 'approved'
      } else if (reviewState === 'changes_requested') {
        reviewStatus = 'changes_requested'
        eventType = 'github_changes_requested'
      } else {
        console.log(`[webhook/github] Review state ${reviewState} for PR #${prNumber} logged but status unchanged.`)
      }

      if (reviewStatus !== 'pending') {
        await updatePR(localPR.id, { reviewStatus })
        
        await createInboxEvent({
          type: eventType as any,
          title: `Review ${reviewState}: PR #${prNumber}`,
          body: `Reviewer ${review.user.login} submitted review state "${reviewState}".`,
          severity: reviewState === 'approved' ? 'success' : 'warning',
          projectId: localPR.projectId,
          actionUrl: review.html_url
        })
      }
      break

    case 'dismissed':
      await updatePR(localPR.id, { reviewStatus: 'pending' })
      break

    default:
      console.log(`[webhook/github] Review action ${action} not explicitly handled.`)
  }
}

```

### lib/github/handlers/handle-workflow-run-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getAgentRun, setAgentRunStatus } from '@/lib/services/agent-runs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { getStorageAdapter } from '@/lib/storage-adapter'
import type { AgentRun } from '@/types/agent-run'

export async function handleWorkflowRunEvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload } = ctx
  const workflowRun = rawPayload.workflow_run as any
  if (!workflowRun) return

  const githubWorkflowRunId = workflowRun.id.toString()
  console.log(`[webhook/github] Handling workflow_run.${action} for ID ${githubWorkflowRunId}`)

  // Find the agent run by GitHub workflow run ID
  const adapter = getStorageAdapter()
  const agentRuns = await adapter.getCollection<AgentRun>('agentRuns')
  const agentRun = agentRuns.find((r) => r.githubWorkflowRunId === githubWorkflowRunId)

  if (!agentRun) {
    console.log(`[webhook/github] No local agent run found for workflow ID ${githubWorkflowRunId}`)
    return
  }

  switch (action) {
    case 'requested':
    case 'in_progress':
      await setAgentRunStatus(agentRun.id, 'running')
      break

    case 'completed':
      const conclusion = workflowRun.conclusion
      const status = conclusion === 'success' ? 'succeeded' : 'failed'
      
      await setAgentRunStatus(agentRun.id, status, {
        summary: `GitHub workflow ${conclusion}: ${workflowRun.html_url}`,
        error: conclusion === 'failure' ? 'Workflow run failed on GitHub.' : undefined
      })

      await createInboxEvent({
        type: conclusion === 'success' ? 'github_workflow_succeeded' : 'github_workflow_failed',
        title: `Workflow ${conclusion}`,
        body: `Mira execution for project "${agentRun.projectId}" ${conclusion}.`,
        severity: conclusion === 'success' ? 'success' : 'error',
        projectId: agentRun.projectId,
        actionUrl: workflowRun.html_url
      })
      break

    default:
      console.log(`[webhook/github] Workflow run action ${action} not specifically handled.`)
  }
}

```

### lib/github/handlers/index.ts

```typescript
import type { GitHubWebhookContext } from '@/types/webhook'
import { handleIssueEvent } from './handle-issue-event'
import { handlePREvent } from './handle-pr-event'
import { handleWorkflowRunEvent } from './handle-workflow-run-event'
import { handlePRReviewEvent } from './handle-pr-review-event'

const handlers: Record<string, (ctx: GitHubWebhookContext) => Promise<void>> = {
  issues: handleIssueEvent,
  pull_request: handlePREvent,
  workflow_run: handleWorkflowRunEvent,
  pull_request_review: handlePRReviewEvent,
}

export async function routeGitHubEvent(ctx: GitHubWebhookContext): Promise<void> {
  const handler = handlers[ctx.event]
  if (handler) {
    console.log(`[webhook/github] Handling ${ctx.event}.${ctx.action}`)
    await handler(ctx)
  } else {
    console.log(`[webhook/github] Unhandled event: ${ctx.event}`)
  }
}

```

### lib/github/signature.ts

```typescript
import crypto from 'crypto'

export function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

```

### lib/guards.ts

```typescript
import type { Idea } from '@/types/idea'
import type { Project } from '@/types/project'
import type { ExperienceInstance, Resolution } from '@/types/experience'
import {
  RESOLUTION_DEPTHS,
  RESOLUTION_MODES,
  RESOLUTION_TIME_SCOPES,
  RESOLUTION_INTENSITIES,
  MASTERY_STATUSES,
} from '@/lib/constants'
import type { KnowledgeUnit, MasteryStatus } from '@/types/knowledge'

export function isIdea(value: unknown): value is Idea {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'status' in value
  )
}

export function isProject(value: unknown): value is Project {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'state' in value &&
    'health' in value
  )
}

export function isExperienceInstance(value: unknown): value is ExperienceInstance {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'instance_type' in value &&
    'status' in value &&
    'resolution' in value
  )
}

export function isEphemeralExperience(instance: ExperienceInstance): boolean {
  return instance.instance_type === 'ephemeral'
}

export function isPersistentExperience(instance: ExperienceInstance): boolean {
  return instance.instance_type === 'persistent'
}

export function isValidResolution(obj: unknown): obj is Resolution {
  if (typeof obj !== 'object' || obj === null) return false

  const res = obj as Record<string, unknown>
  return (
    RESOLUTION_DEPTHS.includes(res.depth as any) &&
    RESOLUTION_MODES.includes(res.mode as any) &&
    RESOLUTION_TIME_SCOPES.includes(res.timeScope as any) &&
    RESOLUTION_INTENSITIES.includes(res.intensity as any)
  )
}

export function isKnowledgeUnit(val: unknown): val is KnowledgeUnit {
  return (
    typeof val === 'object' &&
    val !== null &&
    'id' in val &&
    'topic' in val &&
    'domain' in val &&
    'unit_type' in val &&
    'mastery_status' in val
  )
}

export function isValidMasteryStatus(val: unknown): val is MasteryStatus {
  return typeof val === 'string' && MASTERY_STATUSES.includes(val as any)
}

```

### lib/hooks/useDraftPersistence.ts

```typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_USER_ID } from '@/lib/constants';

export interface DraftContext {
  drafts: Record<string, Record<string, any>>;
  saveDraft: (stepId: string, content: Record<string, any>) => void;
  getDraft: (stepId: string) => Record<string, any> | null;
  isLoading: boolean;
  lastSaved: Record<string, string>;
}

/**
 * Hook to manage step-level draft persistence with auto-save and hydration.
 */
export function useDraftPersistence(instanceId: string): DraftContext {
  const [drafts, setDrafts] = useState<Record<string, Record<string, any>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Record<string, string>>({});
  
  // Refs for debouncing
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingChanges = useRef<Record<string, Record<string, any>>>({});

  // 1. Initial hydration on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadDrafts = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/drafts?instanceId=${instanceId}`);
        if (!res.ok) throw new Error('Failed to load drafts');
        
        const { data } = await res.json();
        
        if (isMounted && data) {
          setDrafts(data);
          
          // Initialize lastSaved from loaded data if we had timestamps (though they're not in the GET /api/drafts response yet)
          // For now we'll just leave them empty until a save happens
        }
      } catch (err) {
        console.error('[useDraftPersistence] Load failed:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDrafts();
    
    return () => {
      isMounted = false;
      // Cleanup timers on unmount
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, [instanceId]);

  // 2. Save function with debounce
  const saveDraft = useCallback((stepId: string, content: Record<string, any>) => {
    // Update local state immediately for UI responsiveness
    setDrafts(prev => ({
      ...prev,
      [stepId]: content
    }));

    // Store pending change
    pendingChanges.current[stepId] = content;

    // Clear existing timer for this step
    if (debounceTimers.current[stepId]) {
      clearTimeout(debounceTimers.current[stepId]);
    }

    // Set new timer
    debounceTimers.current[stepId] = setTimeout(async () => {
      const contentToSave = pendingChanges.current[stepId];
      if (!contentToSave) return;

      try {
        const res = await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instanceId,
            stepId,
            userId: DEFAULT_USER_ID,
            content: contentToSave
          })
        });

        if (res.ok) {
          setLastSaved(prev => ({
            ...prev,
            [stepId]: new Date().toISOString()
          }));
          delete pendingChanges.current[stepId];
        } else {
          console.error(`[useDraftPersistence] Save failed for step ${stepId}`);
        }
      } catch (err) {
        console.error(`[useDraftPersistence] Save failed for step ${stepId}:`, err);
      }
    }, 500);
  }, [instanceId]);

  // 3. Getter function
  const getDraft = useCallback((stepId: string) => {
    return drafts[stepId] || null;
  }, [drafts]);

  return {
    drafts,
    saveDraft,
    getDraft,
    isLoading,
    lastSaved
  };
}

```

### lib/hooks/useInteractionCapture.ts

```typescript
'use client';

import { useRef } from 'react';
import { INTERACTION_EVENTS, buildInteractionPayload, type InteractionEventType } from '@/lib/enrichment/interaction-events';

/**
 * useInteractionCapture - A pure client-side hook for experience telemetry.
 * All methods are fire-and-forget, non-blocking, and do not track state.
 */
export function useInteractionCapture(instanceId: string) {
  const stepTimers = useRef<Record<string, number>>({});
  
  const postEvent = (eventType: InteractionEventType, stepId?: string, payload: Record<string, any> = {}) => {
    // Fire and forget
    const data = buildInteractionPayload(eventType, instanceId, stepId, payload);
    
    fetch('/api/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }).catch((err) => {
      // Quietly log errors to console without interrupting the UI
      console.warn(`[InteractionCapture] Failed to record ${eventType}:`, err);
    });
  };

  const trackStepView = (stepId: string) => {
    postEvent(INTERACTION_EVENTS.STEP_VIEWED, stepId);
  };

  const trackAnswer = (stepId: string, answers: Record<string, any>) => {
    postEvent(INTERACTION_EVENTS.ANSWER_SUBMITTED, stepId, answers);
  };

  const trackSkip = (stepId: string) => {
    postEvent(INTERACTION_EVENTS.STEP_SKIPPED, stepId);
  };

  const trackComplete = (stepId: string, payload?: Record<string, any>) => {
    postEvent(INTERACTION_EVENTS.TASK_COMPLETED, stepId, payload);
  };

  const trackExperienceStart = () => {
    postEvent(INTERACTION_EVENTS.EXPERIENCE_STARTED);
  };

  const trackExperienceComplete = () => {
    postEvent(INTERACTION_EVENTS.EXPERIENCE_COMPLETED);
  };

  const trackDraft = (stepId: string, draft: Record<string, any>) => {
    postEvent(INTERACTION_EVENTS.DRAFT_SAVED, stepId, draft);
  };

  const startStepTimer = (stepId: string) => {
    stepTimers.current[stepId] = Date.now();
  };

  const endStepTimer = (stepId: string) => {
    const startTime = stepTimers.current[stepId];
    if (startTime) {
      const durationMs = Date.now() - startTime;
      postEvent(INTERACTION_EVENTS.TIME_ON_STEP, stepId, { durationMs });
      // Reset after capture
      delete stepTimers.current[stepId];
    }
  };

  const trackBlockHint = (stepId: string, blockId: string, payload: Record<string, any> = {}) => {
    postEvent(INTERACTION_EVENTS.BLOCK_HINT_USED, stepId, { blockId, ...payload });
  };

  const trackBlockPrediction = (stepId: string, blockId: string, prediction: string) => {
    postEvent(INTERACTION_EVENTS.BLOCK_PREDICTION_SUBMITTED, stepId, { blockId, prediction });
  };

  const trackBlockExercise = (stepId: string, blockId: string, result: Record<string, any>) => {
    postEvent(INTERACTION_EVENTS.BLOCK_EXERCISE_COMPLETED, stepId, { blockId, ...result });
  };

  const trackCoachTriggerCheckpointFail = (stepId: string, result: Record<string, any>) => {
    postEvent(INTERACTION_EVENTS.COACH_TRIGGER_CHECKPOINT_FAIL, stepId, result);
  };

  const trackCoachTriggerDwell = (stepId: string, dwellMs: number) => {
    postEvent(INTERACTION_EVENTS.COACH_TRIGGER_DWELL, stepId, { dwellMs });
  };

  const trackCoachTriggerUnreadKnowledge = (stepId: string, knowledgeUnitId: string) => {
    postEvent(INTERACTION_EVENTS.COACH_TRIGGER_UNREAD_KNOWLEDGE, stepId, { knowledgeUnitId });
  };

  return {
    trackStepView,
    trackAnswer,
    trackSkip,
    trackComplete,
    trackExperienceStart,
    trackExperienceComplete,
    trackDraft,
    startStepTimer,
    endStepTimer,
    trackBlockHint,
    trackBlockPrediction,
    trackBlockExercise,
    trackCoachTriggerCheckpointFail,
    trackCoachTriggerDwell,
    trackCoachTriggerUnreadKnowledge,
  };
};

```

### lib/routes.ts

```typescript
export const ROUTES = {
  home: '/',
  send: '/send',
  drill: '/drill',
  drillSuccess: '/drill/success',
  drillEnd: '/drill/end',
  arena: '/arena',
  arenaProject: (id: string) => `/arena/${id}`,
  icebox: '/icebox',
  shipped: '/shipped',
  killed: '/killed',
  review: (prId: string) => `/review/${prId}`,
  inbox: '/inbox',
  devGptSend: '/dev/gpt-send',
  // GitHub pages + API routes
  githubPlayground: '/dev/github-playground',
  githubTestConnection: '/api/github/test-connection',
  githubCreateIssue: '/api/github/create-issue',
  githubDispatchWorkflow: '/api/github/dispatch-workflow',
  githubCreatePR: '/api/github/create-pr',
  githubSyncPR: '/api/github/sync-pr',
  githubMergePR: '/api/github/merge-pr',
  githubTriggerAgent: '/api/github/trigger-agent',

  // --- Sprint 3: Experience Engine ---
  workspace: (id: string) => `/workspace/${id}`,
  library: '/library',
  timeline: '/timeline',
  profile: '/profile',

  // --- Sprint 8: Knowledge Tab ---
  knowledge: '/knowledge',
  knowledgeUnit: (id: string) => `/knowledge/${id}`,
  // --- Sprint 13: Goal OS + Skill Map ---
  skills: '/skills',
  skillDomain: (id: string) => `/skills/${id}`,
  // --- Sprint 17: Mind Map Station ---
  mindMap: '/map',
  // --- Sprint 24: Agent Memory ---
  memory: '/memory',
} as const

```

### lib/seed-data.ts

```typescript
import type { StudioStore } from './storage'
import { DEFAULT_USER_ID } from './constants'

export function getSeedData(): StudioStore {
  return {
    ideas: [
      {
        id: 'idea-001',
        userId: DEFAULT_USER_ID,
        title: 'AI-powered code review assistant',
        rawPrompt: 'What if we had a tool that could automatically review PRs and suggest improvements based on team coding standards?',
        gptSummary: 'A GitHub-integrated tool that analyzes pull requests against defined coding standards and provides actionable feedback.',
        vibe: 'productivity',
        audience: 'engineering teams',
        intent: 'Reduce code review bottlenecks and maintain code quality at scale.',
        created_at: '2026-03-22T00:13:00.000Z',
        status: 'captured',
      },
      {
        id: 'idea-002',
        userId: DEFAULT_USER_ID,
        title: 'Team onboarding checklist builder',
        rawPrompt: 'Build something to help companies create interactive onboarding flows for new hires',
        gptSummary: 'A tool for building structured, trackable onboarding checklists with progress visibility for managers and new hires.',
        vibe: 'operations',
        audience: 'HR teams and new employees',
        intent: 'Cut onboarding time and reduce "what do I do next" anxiety.',
        created_at: '2026-03-20T00:43:00.000Z',
        status: 'icebox',
      },
    ],
    drillSessions: [
      {
        id: 'drill-001',
        ideaId: 'idea-001',
        intent: 'Reduce code review bottlenecks and maintain code quality at scale.',
        successMetric: 'PR review time drops by 40% in first month',
        scope: 'medium',
        executionPath: 'assisted',
        urgencyDecision: 'now',
        finalDisposition: 'arena',
        completedAt: '2026-03-22T00:23:00.000Z',
      },
    ],
    projects: [
      {
        id: 'proj-001',
        ideaId: 'idea-003',
        name: 'Mira Studio v1',
        summary: 'The Vercel-hosted studio UI for managing ideas from capture to execution.',
        state: 'arena',
        health: 'green',
        currentPhase: 'Core UI',
        nextAction: 'Review open PRs',
        activePreviewUrl: 'https://preview.vercel.app/mira-studio',
        createdAt: '2026-03-19T00:43:00.000Z',
        updatedAt: '2026-03-21T22:43:00.000Z',
      },
      {
        id: 'proj-002',
        ideaId: 'idea-004',
        name: 'Custom GPT Intake Layer',
        summary: 'The ChatGPT custom action that sends structured idea payloads to Mira.',
        state: 'arena',
        health: 'yellow',
        currentPhase: 'Integration',
        nextAction: 'Fix webhook auth',
        createdAt: '2026-03-15T00:43:00.000Z',
        updatedAt: '2026-03-21T00:43:00.000Z',
      },
      {
        id: 'proj-003',
        ideaId: 'idea-005',
        name: 'Analytics Dashboard',
        summary: 'Shipped product metrics for internal tracking.',
        state: 'shipped',
        health: 'green',
        currentPhase: 'Shipped',
        nextAction: '',
        activePreviewUrl: 'https://analytics.example.com',
        createdAt: '2026-02-20T00:43:00.000Z',
        updatedAt: '2026-03-17T00:43:00.000Z',
        shippedAt: '2026-03-17T00:43:00.000Z',
      },
      {
        id: 'proj-004',
        ideaId: 'idea-006',
        name: 'Mobile App v2',
        summary: 'Complete rebuild of mobile experience.',
        state: 'killed',
        health: 'red',
        currentPhase: 'Killed',
        nextAction: '',
        createdAt: '2026-02-05T00:43:00.000Z',
        updatedAt: '2026-03-12T00:43:00.000Z',
        killedAt: '2026-03-12T00:43:00.000Z',
        killedReason: 'Scope too large for current team. Web-first is the right call.',
      },
    ],
    tasks: [
      {
        id: 'task-001',
        projectId: 'proj-001',
        title: 'Implement drill tunnel flow',
        status: 'in_progress',
        priority: 'high',
        createdAt: '2026-03-21T00:43:00.000Z',
      },
      {
        id: 'task-002',
        projectId: 'proj-001',
        title: 'Build arena project card',
        status: 'done',
        priority: 'high',
        linkedPrId: 'pr-001',
        createdAt: '2026-03-20T12:43:00.000Z',
      },
      {
        id: 'task-003',
        projectId: 'proj-001',
        title: 'Wire API routes to mock data',
        status: 'pending',
        priority: 'medium',
        createdAt: '2026-03-21T12:43:00.000Z',
      },
      {
        id: 'task-004',
        projectId: 'proj-002',
        title: 'Fix webhook signature validation',
        status: 'blocked',
        priority: 'high',
        createdAt: '2026-03-21T18:43:00.000Z',
      },
    ],
    prs: [
      {
        id: 'pr-001',
        projectId: 'proj-001',
        title: 'feat: arena project cards',
        branch: 'feat/arena-cards',
        status: 'merged',
        previewUrl: 'https://preview.vercel.app/arena-cards',
        buildState: 'success',
        mergeable: true,
        number: 12,
        author: 'builder',
        createdAt: '2026-03-21T00:43:00.000Z',
      },
      {
        id: 'pr-002',
        projectId: 'proj-001',
        title: 'feat: drill tunnel components',
        branch: 'feat/drill-tunnel',
        status: 'open',
        previewUrl: 'https://preview.vercel.app/drill-tunnel',
        buildState: 'running',
        mergeable: true,
        number: 14,
        author: 'builder',
        createdAt: '2026-03-21T22:43:00.000Z',
      },
    ],
    inbox: [
      {
        id: 'evt-001',
        type: 'idea_captured',
        title: 'New idea arrived',
        body: 'AI-powered code review assistant — ready for drill.',
        timestamp: '2026-03-22T00:13:00.000Z',
        severity: 'info',
        actionUrl: '/send',
        read: false,
      },
      {
        id: 'evt-002',
        projectId: 'proj-001',
        type: 'pr_opened',
        title: 'PR opened: feat/drill-tunnel',
        body: 'A new pull request is ready for review.',
        timestamp: '2026-03-21T22:43:00.000Z',
        severity: 'info',
        actionUrl: '/review/pr-002',
        read: false,
      },
      {
        id: 'evt-003',
        projectId: 'proj-002',
        type: 'build_failed',
        title: 'Build failed: Custom GPT Intake',
        body: 'Webhook auth integration is failing. Action needed.',
        timestamp: '2026-03-21T00:43:00.000Z',
        severity: 'error',
        actionUrl: '/arena/proj-002',
        read: false,
      },
    ],
    // Sprint 2: new collections (start empty)
    agentRuns: [],
    externalRefs: [],
  }
}

```

### lib/services/agent-memory-service.ts

```typescript
// lib/services/agent-memory-service.ts
import { AgentMemoryEntry, OperationalContext, MemoryEntryKind, MemoryClass } from '@/types/agent-memory';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { generateId } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * Normalizes a DB row (snake_case) to the TS AgentMemoryEntry shape (camelCase).
 */
function fromDB(row: any): AgentMemoryEntry {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    memoryClass: row.memory_class,
    topic: row.topic,
    content: row.content,
    tags: row.tags || [],
    confidence: Number(row.confidence),
    usageCount: row.usage_count,
    pinned: row.pinned,
    source: row.source,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    metadata: row.metadata || {},
  };
}

/**
 * Normalizes a TS AgentMemoryEntry (camelCase) to DB row shape (snake_case).
 */
function toDB(memory: Partial<AgentMemoryEntry>): Record<string, any> {
  const row: Record<string, any> = {};
  if (memory.id) row.id = memory.id;
  if (memory.userId) row.user_id = memory.userId;
  if (memory.kind) row.kind = memory.kind;
  if (memory.memoryClass) row.memory_class = memory.memoryClass;
  if (memory.topic) row.topic = memory.topic;
  if (memory.content) row.content = memory.content;
  if (memory.tags) row.tags = memory.tags;
  if (memory.confidence !== undefined) row.confidence = memory.confidence;
  if (memory.usageCount !== undefined) row.usage_count = memory.usageCount;
  if (memory.pinned !== undefined) row.pinned = memory.pinned;
  if (memory.source) row.source = memory.source;
  if (memory.createdAt) row.created_at = memory.createdAt;
  if (memory.lastUsedAt) row.last_used_at = memory.lastUsedAt;
  if (memory.metadata) row.metadata = memory.metadata;
  return row;
}

/**
 * Records a new memory or boosts an existing one if matches precisely (user, topic, kind, content).
 * Lock 2: Deduplication on (user_id, topic, kind, content).
 */
export async function recordMemory(
  params: {
    userId: string;
    kind: MemoryEntryKind;
    topic: string;
    content: string;
    memoryClass?: MemoryClass;
    tags?: string[];
    metadata?: Record<string, any>;
    source?: 'gpt_learned' | 'admin_seeded';
    confidence?: number;
    pinned?: boolean;
  }
): Promise<AgentMemoryEntry> {
  const adapter = getStorageAdapter();
  const supabase = getSupabaseClient();

  if (!supabase) {
    const existing = await adapter.query<any>('agent_memory', {
      user_id: params.userId,
      topic: params.topic,
      kind: params.kind,
      content: params.content,
    });

    if (existing.length > 0) {
      const match = existing[0];
      const updates = {
        usage_count: (match.usage_count || 0) + 1,
        confidence: Math.min(1.0, (Number(match.confidence) || 0) + 0.05),
        last_used_at: new Date().toISOString(),
      };
      const updated = await adapter.updateItem<any>('agent_memory', match.id, updates);
      return fromDB(updated);
    }

    const newItem = toDB({
      id: generateId(),
      userId: params.userId,
      kind: params.kind,
      topic: params.topic,
      content: params.content,
      memoryClass: params.memoryClass || 'semantic',
      tags: params.tags || [],
      confidence: params.confidence || 0.6,
      usageCount: 1,
      pinned: params.pinned || false,
      source: params.source || 'gpt_learned',
      metadata: params.metadata || {},
    });
    const saved = await adapter.saveItem<any>('agent_memory', newItem);
    return fromDB(saved);
  }

  const { data: match, error: fetchError } = await supabase
    .from('agent_memory')
    .select('*')
    .eq('user_id', params.userId)
    .eq('topic', params.topic)
    .eq('kind', params.kind)
    .eq('content', params.content)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (match) {
    const { data: updated, error: updateError } = await supabase
      .from('agent_memory')
      .update({
        usage_count: (match.usage_count || 0) + 1,
        confidence: Math.min(1.0, (Number(match.confidence) || 0) + 0.05),
        last_used_at: new Date().toISOString(),
      })
      .eq('id', match.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return fromDB(updated);
  }

  const newItem = toDB({
    id: generateId(),
    userId: params.userId,
    kind: params.kind,
    topic: params.topic,
    content: params.content,
    memoryClass: params.memoryClass || 'semantic',
    tags: params.tags || [],
    confidence: params.confidence || 0.6,
    usageCount: 1,
    pinned: params.pinned || false,
    source: params.source || 'gpt_learned',
    metadata: params.metadata || {},
  });

  const { data: saved, error: saveError } = await supabase
    .from('agent_memory')
    .insert(newItem)
    .select()
    .single();

  if (saveError) throw saveError;
  return fromDB(saved);
}

/**
 * Retrieves memories for a user with optional filters.
 */
export async function getMemories(
  userId: string,
  filters?: {
    topic?: string;
    kind?: MemoryEntryKind;
    source?: string;
    pinned?: boolean;
    limit?: number;
  }
): Promise<AgentMemoryEntry[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const adapter = getStorageAdapter();
    const queryParams: Record<string, any> = { user_id: userId };
    if (filters?.topic) queryParams.topic = filters.topic;
    if (filters?.kind) queryParams.kind = filters.kind;
    if (filters?.pinned !== undefined) queryParams.pinned = filters.pinned;
    
    const raw = await adapter.query<any>('agent_memory', queryParams);
    return raw.map(fromDB);
  }

  let query = supabase
    .from('agent_memory')
    .select('*')
    .eq('user_id', userId);

  if (filters?.topic) query = query.eq('topic', filters.topic);
  if (filters?.kind) query = query.eq('kind', filters.kind);
  if (filters?.pinned !== undefined) query = query.eq('pinned', filters.pinned);
  
  query = query.order('pinned', { ascending: false })
               .order('usage_count', { ascending: false })
               .order('last_used_at', { ascending: false });

  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data.map(fromDB);
}

/**
 * Gets a single memory by ID.
 */
export async function getMemoryById(id: string): Promise<AgentMemoryEntry | null> {
  const adapter = getStorageAdapter();
  const raw = await adapter.query<any>('agent_memory', { id });
  return raw.length > 0 ? fromDB(raw[0]) : null;
}

/**
 * Updates a memory entry (correction path).
 */
export async function updateMemory(id: string, updates: Partial<AgentMemoryEntry>): Promise<AgentMemoryEntry> {
  const adapter = getStorageAdapter();
  const updated = await adapter.updateItem<any>('agent_memory', id, toDB(updates));
  return fromDB(updated);
}

/**
 * Deletes a memory entry.
 */
export async function deleteMemory(id: string): Promise<void> {
  const adapter = getStorageAdapter();
  await adapter.deleteItem('agent_memory', id);
}

/**
 * Assembles the operational context for the GPT state packet.
 * Lock 1: Lightweight handle-based context.
 */
export async function getOperationalContext(userId: string): Promise<OperationalContext | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const [memoryStats, recentMemories, topics, boards] = await Promise.all([
    supabase.from('agent_memory').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('agent_memory')
      .select('id')
      .eq('user_id', userId)
      .order('pinned', { ascending: false })
      .order('usage_count', { ascending: false })
      .limit(10),
    supabase.from('agent_memory').select('topic').eq('user_id', userId).order('last_used_at', { ascending: false }).limit(100),
    supabase.from('think_boards')
      .select('id, name, purpose')
      .eq('is_archived', false)
      .limit(20)
  ]);

  const activeTopics = Array.from(new Set((topics.data || []).map((t: any) => t.topic))).slice(0, 5);

  const { data: nodeCounts } = await supabase
    .from('think_nodes')
    .select('board_id')
    .in('board_id', (boards.data || []).map(b => b.id));

  const countMap = (nodeCounts || []).reduce((acc: any, n) => {
    acc[n.board_id] = (acc[n.board_id] || 0) + 1;
    return acc;
  }, {});

  const boardSummaries = (boards.data || []).map(b => ({
    id: b.id,
    name: b.name,
    purpose: b.purpose,
    nodeCount: countMap[b.id] || 0
  }));

  const { data: lastRec } = await supabase
    .from('agent_memory')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if ((memoryStats.count || 0) === 0 && boardSummaries.length === 0) return null;

  return {
    memory_count: memoryStats.count || 0,
    recent_memory_ids: (recentMemories.data || []).map((m: any) => m.id),
    last_recorded_at: lastRec?.created_at || null,
    active_topics: activeTopics,
    boards: boardSummaries
  };
}

/**
 * W3: Automated Consolidation (Lock 3)
 */
export async function consolidateMemory(userId: string, lookbackHours: number = 24): Promise<{ extractedCount: number, message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { extractedCount: 0, message: "Consolidation requires a live database connection." };
  }

  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

  // 1. Fetch recently completed experiences
  const { data: experiences } = await supabase
    .from('experience_instances')
    .select('id, title, goal, synthesis')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('updated_at', since);

  let extractedCount = 0;

  if (experiences && experiences.length > 0) {
    for (const exp of experiences) {
      if (exp.synthesis) {
        await recordMemory({
          userId,
          kind: 'observation',
          topic: exp.title,
          content: `Completed experience "${exp.title}". Key takeaway: ${exp.synthesis.substring(0, 200)}...`,
          source: 'gpt_learned',
          metadata: { experienceId: exp.id, auto_extracted: true }
        });
        extractedCount++;
      }
    }
  }

  // 2. Fetch recent high-friction interactions
  const { data: interactions } = await supabase
    .from('interactions')
    .select('id, event_type, payload')
    .eq('user_id', userId)
    .gte('created_at', since)
    .gt('friction_score', 0.7);

  if (interactions && interactions.length > 0) {
    for (const intr of interactions) {
      if (intr.payload?.content) {
        await recordMemory({
          userId,
          kind: 'strategy',
          topic: 'Learning Friction',
          content: `Encountered friction in ${intr.event_type}. Note: ${intr.payload.content.substring(0, 100)}`,
          source: 'gpt_learned',
          metadata: { interactionId: intr.id, auto_extracted: true }
        });
        extractedCount++;
      }
    }
  }

  if (extractedCount === 0) {
    return { extractedCount: 0, message: `No actionable memories found in the last ${lookbackHours} hours.` };
  }

  return { 
    extractedCount, 
    message: `Successfully consolidated ${extractedCount} new memories from recent activity.` 
  };
}

/**
 * Groups memories by topic for Explorer view (Lane 5).
 */
export async function getMemoriesGroupedByTopic(userId: string): Promise<Record<string, AgentMemoryEntry[]>> {
  const memories = await getMemories(userId);
  return memories.reduce((acc: Record<string, AgentMemoryEntry[]>, memory) => {
    const topic = memory.topic || 'General';
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push(memory);
    return acc;
  }, {});
}

/**
 * W4: Seed default memory entries (Frozen list per sprint.md)
 */
export async function seedDefaultMemory(userId: string): Promise<void> {
  const defaultMemories = [
    {
      kind: 'tactic' as const,
      topic: 'curriculum',
      content: 'Use create_outline before creating experiences for serious topics',
      confidence: 0.9,
      pinned: true
    },
    {
      kind: 'tactic' as const,
      topic: 'enrichment',
      content: 'Check enrichment status in the state packet before creating new experiences on the same topic',
      confidence: 0.9,
      pinned: true
    },
    {
      kind: 'strategy' as const,
      topic: 'workflow',
      content: 'For new domains: goal → outline → research dispatch → experience creation (not experience first)',
      confidence: 0.9,
      pinned: true
    },
    {
      kind: 'observation' as const,
      topic: 'pedagogy',
      content: 'Checkpoint questions with free_text format produce stronger learning outcomes than multiple choice',
      confidence: 0.85
    },
    {
      kind: 'tactic' as const,
      topic: 'maps',
      content: 'Use board_from_text or expand_board_branch instead of creating nodes one at a time',
      confidence: 0.85
    },
    {
      kind: 'preference' as const,
      topic: 'user learning style',
      content: 'User prefers worked examples and concrete scenarios over abstract explanations',
      confidence: 0.8
    },
    {
      kind: 'strategy' as const,
      topic: 'experience design',
      content: 'Keep experiences to 3-6 steps covering one subtopic. Chain small experiences rather than building monoliths.',
      confidence: 0.9,
      pinned: true
    }
  ];

  for (const mem of defaultMemories) {
    try {
      await recordMemory({
        ...mem,
        userId,
        source: 'admin_seeded'
      });
    } catch (e) {
      console.warn(`Failed to seed memory: ${mem.topic}`, e);
    }
  }
}

```

### lib/services/agent-runs-service.ts

```typescript
/**
 * lib/services/agent-runs-service.ts
 * CRUD service for AgentRun entities — tracks GitHub workflow / Copilot runs.
 * All reads/writes go through the storage adapter (SOP-6 + SOP-9).
 */

import type { AgentRun, AgentRunKind, AgentRunStatus } from '@/types/agent-run'
import type { ExecutionMode } from '@/lib/constants'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

type CreateAgentRunInput = {
  projectId: string
  taskId?: string
  kind: AgentRunKind
  executionMode: ExecutionMode
  triggeredBy: string
  githubWorkflowRunId?: string
  githubIssueNumber?: number
}

/** Create and persist a new AgentRun. Returns the created record. */
export async function createAgentRun(data: CreateAgentRunInput): Promise<AgentRun> {
  const adapter = getStorageAdapter()
  const run: AgentRun = {
    id: generateId(),
    status: 'queued',
    startedAt: new Date().toISOString(),
    ...data,
  }
  return adapter.saveItem<AgentRun>('agentRuns', run)
}

/** Retrieve a single AgentRun by its ID. Returns undefined if not found. */
export async function getAgentRun(id: string): Promise<AgentRun | undefined> {
  const adapter = getStorageAdapter()
  const runs = await adapter.getCollection<AgentRun>('agentRuns')
  return runs.find((r) => r.id === id)
}

/** All AgentRuns for a given project, sorted by startedAt descending. */
export async function getAgentRunsForProject(projectId: string): Promise<AgentRun[]> {
  const adapter = getStorageAdapter()
  const runs = await adapter.getCollection<AgentRun>('agentRuns')
  return runs
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

/** Partial-update an AgentRun by ID. Merges supplied fields into the record. */
export async function updateAgentRun(
  id: string,
  updates: Partial<Omit<AgentRun, 'id' | 'projectId'>>
): Promise<AgentRun | undefined> {
  const adapter = getStorageAdapter()
  try {
    return await adapter.updateItem<AgentRun>('agentRuns', id, updates)
  } catch {
    return undefined
  }
}

/** Convenience: the most recently started run for a project. */
export async function getLatestRunForProject(projectId: string): Promise<AgentRun | undefined> {
  const runs = await getAgentRunsForProject(projectId)
  return runs[0]
}

/** Update just the status field (and optionally finishedAt) atomically. */
export async function setAgentRunStatus(
  id: string,
  status: AgentRunStatus,
  opts?: { summary?: string; error?: string }
): Promise<AgentRun | undefined> {
  const finishedAt =
    status === 'succeeded' || status === 'failed'
      ? new Date().toISOString()
      : undefined
  return updateAgentRun(id, { status, finishedAt, ...opts })
}

```

### lib/services/change-report-service.ts

```typescript
import { getStorageAdapter } from '../storage-adapter'
import type { ChangeReport, CreateChangeReportPayload } from '@/types/change-report'
import { generateId } from '@/lib/utils'

export async function createChangeReport(payload: CreateChangeReportPayload): Promise<ChangeReport> {
  const adapter = getStorageAdapter()
  
  const report: ChangeReport = {
    id: generateId(),
    type: payload.type,
    url: payload.url,
    content: payload.content,
    status: 'open',
    createdAt: new Date().toISOString(),
  }

  const dbData = {
    id: report.id,
    type: report.type,
    url: report.url,
    content: report.content,
    status: report.status,
    created_at: report.createdAt,
  }

  await adapter.saveItem('change_reports', dbData)
  
  return report
}

export async function getOpenChangeReports(): Promise<ChangeReport[]> {
  const adapter = getStorageAdapter()
  const rawData = await adapter.query<any>('change_reports', {})
  
  return rawData
    .filter((r: any) => r.status === 'open')
    .map((r: any) => ({
      id: r.id,
      type: r.type,
      url: r.url,
      content: r.content,
      status: r.status,
      createdAt: r.created_at,
    }))
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

```

### lib/services/curriculum-outline-service.ts

```typescript
import { CurriculumOutline, CurriculumOutlineRow, CurriculumSubtopic } from '@/types/curriculum';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { generateId } from '@/lib/utils';
import { CurriculumStatus } from '@/lib/constants';

// ---------------------------------------------------------------------------
// DB ↔ TS normalization
// ---------------------------------------------------------------------------

/**
 * Map a raw DB row (snake_case) → typed CurriculumOutline (camelCase).
 */
function fromDB(row: any): CurriculumOutline {
  return {
    id: row.id,
    userId: row.user_id,
    topic: row.topic,
    domain: row.domain ?? null,
    discoverySignals: row.discovery_signals ?? {},
    subtopics: row.subtopics ?? [],
    existingUnitIds: row.existing_unit_ids ?? [],
    researchNeeded: row.research_needed ?? [],
    pedagogicalIntent: row.pedagogical_intent ?? 'build_understanding',
    estimatedExperienceCount: row.estimated_experience_count ?? null,
    status: row.status as CurriculumStatus,
    goalId: row.goal_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map a CurriculumOutline (camelCase) → DB row (snake_case).
 * Only includes keys that are explicitly defined.
 */
function toDB(outline: Partial<CurriculumOutline>): Record<string, any> {
  const row: Record<string, any> = {};
  if (outline.id !== undefined) row.id = outline.id;
  if (outline.userId !== undefined) row.user_id = outline.userId;
  if (outline.topic !== undefined) row.topic = outline.topic;
  if (outline.domain !== undefined) row.domain = outline.domain;
  if (outline.discoverySignals !== undefined) row.discovery_signals = outline.discoverySignals;
  if (outline.subtopics !== undefined) row.subtopics = outline.subtopics;
  if (outline.existingUnitIds !== undefined) row.existing_unit_ids = outline.existingUnitIds;
  if (outline.researchNeeded !== undefined) row.research_needed = outline.researchNeeded;
  if (outline.pedagogicalIntent !== undefined) row.pedagogical_intent = outline.pedagogicalIntent;
  if (outline.estimatedExperienceCount !== undefined) row.estimated_experience_count = outline.estimatedExperienceCount;
  if (outline.status !== undefined) row.status = outline.status;
  if (outline.goalId !== undefined) row.goal_id = outline.goalId;
  if (outline.createdAt !== undefined) row.created_at = outline.createdAt;
  if (outline.updatedAt !== undefined) row.updated_at = outline.updatedAt;
  return row;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new curriculum outline.
 * Validates via curriculum-validator (lazy-imported; safe before Lane 1 ships it).
 */
export async function createCurriculumOutline(
  data: Omit<CurriculumOutline, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CurriculumOutline> {
  // Lazy-import validator — compiles cleanly even when Lane 1's file doesn't exist yet
  try {
    const { validateCurriculumOutline } = await import('@/lib/validators/curriculum-validator');
    const validation = validateCurriculumOutline(data);
    if (!validation.valid) {
      throw new Error(`Invalid curriculum outline: ${validation.error}`);
    }
  } catch (importErr: any) {
    if (importErr.message?.startsWith('Invalid curriculum outline')) {
      throw importErr;
    }
    // Validator file not yet available — allow through in development
    console.warn('[curriculum-outline-service] curriculum-validator not found, skipping validation');
  }

  const adapter = getStorageAdapter();
  const now = new Date().toISOString();

  const outline: CurriculumOutline = {
    ...data,
    id: generateId(),
    status: data.status ?? 'planning',
    discoverySignals: data.discoverySignals ?? {},
    existingUnitIds: data.existingUnitIds ?? [],
    researchNeeded: data.researchNeeded ?? [],
    subtopics: data.subtopics ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const row = toDB(outline);
  const saved = await adapter.saveItem<CurriculumOutlineRow>('curriculum_outlines', row as CurriculumOutlineRow);
  return fromDB(saved);
}

/**
 * List all curriculum outlines for a goal.
 */
export async function getOutlinesForGoal(goalId: string): Promise<CurriculumOutline[]> {
  const adapter = getStorageAdapter();
  const rows = await adapter.query<CurriculumOutlineRow>('curriculum_outlines', { goal_id: goalId });
  return rows.map(fromDB);
}

/**
 * Fetch a single curriculum outline by ID.
 */
export async function getCurriculumOutline(id: string): Promise<CurriculumOutline | null> {
  const adapter = getStorageAdapter();
  const rows = await adapter.query<CurriculumOutlineRow>('curriculum_outlines', { id });
  return rows.length > 0 ? fromDB(rows[0]) : null;
}

/**
 * List all curriculum outlines for a user.
 */
export async function getCurriculumOutlinesForUser(userId: string): Promise<CurriculumOutline[]> {
  const adapter = getStorageAdapter();
  const rows = await adapter.query<CurriculumOutlineRow>('curriculum_outlines', { user_id: userId });
  return rows.map(fromDB);
}

/**
 * Get outlines in active or planning status (for GPT state endpoint).
 */
export async function getActiveCurriculumOutlines(userId: string): Promise<CurriculumOutline[]> {
  const all = await getCurriculumOutlinesForUser(userId);
  return all.filter(o => o.status === 'active' || o.status === 'planning');
}

/**
 * Get recently completed outlines, sorted newest first.
 */
export async function getRecentlyCompletedOutlines(
  userId: string,
  limit = 5
): Promise<CurriculumOutline[]> {
  const all = await getCurriculumOutlinesForUser(userId);
  return all
    .filter(o => o.status === 'completed')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}

/**
 * Find an active or planning outline by topic (case-insensitive partial match).
 */
export async function findActiveOutlineByTopic(
  userId: string,
  topic: string
): Promise<CurriculumOutline | null> {
  const active = await getActiveCurriculumOutlines(userId);
  const normalizedTopic = topic.toLowerCase().trim();
  
  // Try exact match first
  const exact = active.find(o => o.topic.toLowerCase().trim() === normalizedTopic);
  if (exact) return exact;
  
  // Fall back to partial match
  return active.find(o => o.topic.toLowerCase().includes(normalizedTopic)) || null;
}

/**
 * Partial update of a curriculum outline (status, subtopics, etc.).
 */
export async function updateCurriculumOutline(
  id: string,
  updates: Partial<Omit<CurriculumOutline, 'id' | 'createdAt'>>
): Promise<CurriculumOutline | null> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  const dbUpdates = toDB({ ...updates, updatedAt: now });
  const updated = await adapter.updateItem<any>('curriculum_outlines', id, dbUpdates);
  return updated ? fromDB(updated) : null;
}

/**
 * Fetch an outline plus its linked experience instances (via subtopic experienceId fields).
 */
export async function getOutlineWithExperiences(
  id: string
): Promise<(CurriculumOutline & { experiences: any[] }) | null> {
  const outline = await getCurriculumOutline(id);
  if (!outline) return null;

  const experienceIds = outline.subtopics
    .map(s => s.experienceId)
    .filter((eid): eid is string => !!eid);

  if (experienceIds.length === 0) {
    return { ...outline, experiences: [] };
  }

  const adapter = getStorageAdapter();
  const experiences: any[] = [];
  for (const eid of experienceIds) {
    const rows = await adapter.query<any>('experience_instances', { id: eid });
    if (rows.length > 0) experiences.push(rows[0]);
  }

  return { ...outline, experiences };
}

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

### lib/services/enrichment-service.ts

```typescript
// lib/services/enrichment-service.ts
import { 
  EnrichmentRequest, 
  EnrichmentRequestRow, 
  EnrichmentDelivery, 
  EnrichmentDeliveryRow 
} from '@/types/enrichment';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { generateId } from '@/lib/utils';
import { EnrichmentRequestStatus, EnrichmentDeliveryStatus } from '@/lib/constants';

function requestFromDB(row: EnrichmentRequestRow): EnrichmentRequest {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    experienceId: row.experience_id,
    stepId: row.step_id,
    requestedGap: row.requested_gap,
    requestContext: row.request_context || {},
    atomTypesRequested: row.atom_types_requested || [],
    status: row.status,
    nexusRunId: row.nexus_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requestToDB(request: Partial<EnrichmentRequest>): Partial<EnrichmentRequestRow> {
  const row: any = {};
  if (request.id) row.id = request.id;
  if (request.userId) row.user_id = request.userId;
  if (request.goalId !== undefined) row.goal_id = request.goalId;
  if (request.experienceId !== undefined) row.experience_id = request.experienceId;
  if (request.stepId !== undefined) row.step_id = request.stepId;
  if (request.requestedGap) row.requested_gap = request.requestedGap;
  if (request.requestContext) row.request_context = request.requestContext;
  if (request.atomTypesRequested) row.atom_types_requested = request.atomTypesRequested;
  if (request.status) row.status = request.status;
  if (request.nexusRunId !== undefined) row.nexus_run_id = request.nexusRunId;
  if (request.createdAt) row.created_at = request.createdAt;
  if (request.updatedAt) row.updated_at = request.updatedAt;
  return row;
}

function deliveryFromDB(row: EnrichmentDeliveryRow): EnrichmentDelivery {
  return {
    id: row.id,
    requestId: row.request_id,
    idempotencyKey: row.idempotency_key,
    sourceService: row.source_service,
    atomType: row.atom_type,
    atomPayload: row.atom_payload,
    targetExperienceId: row.target_experience_id,
    targetStepId: row.target_step_id,
    mappedEntityType: row.mapped_entity_type,
    mappedEntityId: row.mapped_entity_id,
    status: row.status,
    deliveredAt: row.delivered_at,
  };
}

function deliveryToDB(delivery: Partial<EnrichmentDelivery>): Partial<EnrichmentDeliveryRow> {
  const row: any = {};
  if (delivery.id) row.id = delivery.id;
  if (delivery.requestId !== undefined) row.request_id = delivery.requestId;
  if (delivery.idempotencyKey) row.idempotency_key = delivery.idempotencyKey;
  if (delivery.sourceService) row.source_service = delivery.sourceService;
  if (delivery.atomType) row.atom_type = delivery.atomType;
  if (delivery.atomPayload) row.atom_payload = delivery.atomPayload;
  if (delivery.targetExperienceId !== undefined) row.target_experience_id = delivery.targetExperienceId;
  if (delivery.targetStepId !== undefined) row.target_step_id = delivery.targetStepId;
  if (delivery.mappedEntityType !== undefined) row.mapped_entity_type = delivery.mappedEntityType;
  if (delivery.mappedEntityId !== undefined) row.mapped_entity_id = delivery.mappedEntityId;
  if (delivery.status) row.status = delivery.status;
  if (delivery.deliveredAt) row.delivered_at = delivery.deliveredAt;
  return row;
}

export async function createEnrichmentRequest(data: Partial<EnrichmentRequest>): Promise<EnrichmentRequest> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  const request: Partial<EnrichmentRequest> = {
    ...data,
    id: data.id || generateId(),
    status: data.status || 'pending',
    createdAt: now,
    updatedAt: now,
  };
  const row = requestToDB(request);
  const result = await adapter.saveItem<EnrichmentRequestRow>('enrichment_requests', row as EnrichmentRequestRow);
  return requestFromDB(result);
}

export async function updateEnrichmentRequestStatus(id: string, status: EnrichmentRequestStatus, nexusRunId?: string): Promise<void> {
  const adapter = getStorageAdapter();
  const updates: Partial<EnrichmentRequestRow> = { status };
  if (nexusRunId) updates.nexus_run_id = nexusRunId;
  await adapter.updateItem('enrichment_requests', id, updates);
}

export async function getEnrichmentRequestById(id: string): Promise<EnrichmentRequest | null> {
  const adapter = getStorageAdapter();
  const results = await adapter.query<EnrichmentRequestRow>('enrichment_requests', { id });
  return results.length > 0 ? requestFromDB(results[0]) : null;
}

export async function getEnrichmentRequestsForExperience(experienceId: string): Promise<EnrichmentRequest[]> {
  const adapter = getStorageAdapter();
  const results = await adapter.query<EnrichmentRequestRow>('enrichment_requests', { experience_id: experienceId });
  return results.map(requestFromDB);
}

export async function createEnrichmentDelivery(data: Partial<EnrichmentDelivery>): Promise<EnrichmentDelivery> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  const delivery: Partial<EnrichmentDelivery> = {
    ...data,
    id: data.id || generateId(),
    status: data.status || 'received',
    deliveredAt: now,
  };
  const row = deliveryToDB(delivery);
  const result = await adapter.saveItem<EnrichmentDeliveryRow>('enrichment_deliveries', row as EnrichmentDeliveryRow);
  return deliveryFromDB(result);
}

export async function getDeliveryByIdempotencyKey(key: string): Promise<EnrichmentDelivery | null> {
  const adapter = getStorageAdapter();
  const results = await adapter.query<EnrichmentDeliveryRow>('enrichment_deliveries', { idempotency_key: key });
  return results.length > 0 ? deliveryFromDB(results[0]) : null;
}

export async function updateDeliveryStatus(
  id: string, 
  status: EnrichmentDeliveryStatus, 
  mappedEntityType?: string, 
  mappedEntityId?: string
): Promise<void> {
  const adapter = getStorageAdapter();
  const updates: Partial<EnrichmentDeliveryRow> = { status };
  if (mappedEntityType) updates.mapped_entity_type = mappedEntityType;
  if (mappedEntityId) updates.mapped_entity_id = mappedEntityId;
  await adapter.updateItem('enrichment_deliveries', id, updates);
}

/**
 * Returns summary of enrichments for the GPT state packet.
 */
export async function getEnrichmentSummaryForState(userId: string): Promise<Array<{
  topic: string;
  status: string;
  requested_at: string;
}>> {
  const adapter = getStorageAdapter();
  const results = await adapter.query<EnrichmentRequestRow>('enrichment_requests', { user_id: userId });
  
  return results
    .filter(r => r.status === 'dispatched' || r.status === 'pending' || r.status === 'delivered')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5) // Limit to most recent 5
    .map(r => ({
      topic: r.requested_gap,
      status: r.status,
      requested_at: r.created_at
    }));
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
export async function injectEphemeralExperience(data: any): Promise<ExperienceInstance & { steps: ExperienceStep[] }> {
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
    reentry: data.reentry ?? null,
    previous_experience_id: null,
    next_suggested_ids: [],
    friction_level: null,
    source_conversation_id: data.source_conversation_id || null,
    generated_by: data.generated_by || 'gpt',
    realization_id: null,
    published_at: null
  }

  const instance = await createExperienceInstance(instanceData)
  const createdSteps: ExperienceStep[] = []

  if (data.steps && Array.isArray(data.steps)) {
    for (let i = 0; i < data.steps.length; i++) {
      const step = data.steps[i]
      const st = step.step_type || step.type || 'lesson'
      const { type: _tp, step_type: _st, stepType: _stc, title, payload: nestedPayload, completion_rule, ...rest } = step;

      const stepPayload = nestedPayload && Object.keys(nestedPayload).length > 0 ? { ...nestedPayload } : { ...rest };

      const createdStep = await createExperienceStep({
        instance_id: instance.id,
        step_order: i,
        step_type: st,
        title: title || '',
        payload: stepPayload,
        completion_rule: completion_rule || null
      })
      createdSteps.push(createdStep)
    }
  }

  const stepsResponse = createdSteps.map(s => ({
    ...s,
    order_index: s.step_order
  }));

  return { ...instance, steps: stepsResponse };
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
    extractFacetsFlow,
    context
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
  const result = await runFlowSafe(
    suggestNextExperienceFlow,
    context,
    async (output: any) => {
      if (!output || output.error) return null;
      return output.suggestions.map((s: any) => ({
        templateClass: s.templateClass,
        reason: s.reason,
        resolution: s.suggestedResolution,
        confidence: s.confidence
      }));
    }
  );

  return result || fallback;
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
import { getEnrichmentSummaryForState } from './enrichment-service';
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
    capturedIdeas,
    enrichments
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
    getIdeasByStatus('captured'),
    getEnrichmentSummaryForState(userId)
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
      outlineTitle: focusExperience?.curriculum_outline_id 
        ? outlines.find(o => o.id === focusExperience.curriculum_outline_id)?.topic 
        : undefined,
      outlineProgress: focusExperience?.curriculum_outline_id 
        ? (() => {
            const o = outlines.find(o => o.id === focusExperience.curriculum_outline_id);
            if (!o) return undefined;
            const completed = o.subtopics.filter(s => s.status === 'completed').length;
            return Math.round((completed / o.subtopics.length) * 100);
          })()
        : undefined,
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
    pendingEnrichments: enrichments,
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

export async function recordInteraction(data: { instanceId?: string | null; stepId?: string | null; eventType: InteractionEventType; eventPayload: any }): Promise<InteractionEvent> {
  const adapter = getStorageAdapter()
  const event: InteractionEvent = {
    id: generateId(),
    instance_id: data.instanceId ?? null,
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

export async function getInteractionsByUnit(unitId: string): Promise<InteractionEvent[]> {
  const adapter = getStorageAdapter()
  const attempts = await adapter.query<InteractionEvent>('interaction_events', { event_type: 'practice_attempt' })
  return attempts.filter(a => a.event_payload?.unit_id === unitId)
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
    
    const { refineKnowledgeFlow } = await import('@/lib/ai/flows/refine-knowledge-flow');

    const result = await runFlowSafe(
      refineKnowledgeFlow,
      { unitId, userId }
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
import { ThinkBoard, ThinkNode, ThinkEdge, BoardPurpose, LayoutMode } from '@/types/mind-map';
import { MapSummary } from '@/types/synthesis';

// ---------------------------------------------------------------------------
// DB ↔ TS normalization
// ---------------------------------------------------------------------------

function boardFromDB(row: any): ThinkBoard {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    purpose: row.purpose || 'general',
    layoutMode: row.layout_mode || 'radial',
    linkedEntityId: row.linked_entity_id,
    linkedEntityType: row.linked_entity_type,
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
  if (board.purpose !== undefined) row.purpose = board.purpose;
  if (board.layoutMode !== undefined) row.layout_mode = board.layoutMode;
  if (board.linkedEntityId !== undefined) row.linked_entity_id = board.linkedEntityId;
  if (board.linkedEntityType !== undefined) row.linked_entity_type = board.linkedEntityType;
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
      purpose: board.purpose || 'general',
      layoutMode: board.layoutMode || 'radial',
      linkedEntityType: board.linkedEntityType || null,
    };
  }));

  return summaries;
}

export async function createBoard(
  userId: string, 
  name: string, 
  purpose: ThinkBoard['purpose'] = 'general',
  linkedEntityId: string | null = null,
  linkedEntityType: ThinkBoard['linkedEntityType'] = null
): Promise<ThinkBoard> {
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
    purpose,
    layoutMode: 'radial',
    linkedEntityId,
    linkedEntityType,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  const row = boardToDB(board);
  const saved = await adapter.saveItem<any>('think_boards', row);
  const finalBoard = boardFromDB(saved);

  // Apply template if purpose is not general
  if (purpose !== 'general') {
    await applyBoardTemplate(userId, finalBoard.id, name, purpose);
  }

  return finalBoard;
}

export async function updateBoard(boardId: string, updates: Partial<ThinkBoard>): Promise<ThinkBoard | null> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  
  const dbUpdates = boardToDB({ ...updates, updatedAt: now });
  const updated = await adapter.updateItem<any>('think_boards', boardId, dbUpdates);
  return updated ? boardFromDB(updated) : null;
}

export async function deleteBoard(boardId: string): Promise<boolean> {
  const adapter = getStorageAdapter();
  
  // Lock 6: Cascade delete removes edges -> nodes -> board
  // 1. Delete edges
  const edges = await adapter.query<any>('think_edges', { board_id: boardId });
  for (const edge of edges) {
    await adapter.deleteItem('think_edges', edge.id);
  }
  
  // 2. Delete nodes
  const nodes = await adapter.query<any>('think_nodes', { board_id: boardId });
  for (const node of nodes) {
    // Also delete node versions if they exist (best effort)
    try {
      const versions = await adapter.query<any>('think_node_versions', { node_id: node.id });
      for (const version of versions) {
        await adapter.deleteItem('think_node_versions', version.id);
      }
    } catch (e) {}
    await adapter.deleteItem('think_nodes', node.id);
  }
  
  // 3. Delete board
  await adapter.deleteItem('think_boards', boardId);
  return true;
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

// ---------------------------------------------------------------------------
// Board Templates (Sprint 24)
// ---------------------------------------------------------------------------

/**
 * Returns starter node labels for a given board purpose.
 */
export function getBoardTemplate(purpose: BoardPurpose): { children: string[] } | null {
  switch (purpose) {
    case 'idea_planning':
      return { children: ['Market', 'Tech', 'UX', 'Risks'] };
    case 'curriculum_review':
      return { children: ['Foundations', 'Core Concepts', 'Advanced Applied', 'Case Studies'] };
    case 'lesson_plan':
      return { children: ['Primer', 'Practice', 'Checkpoint', 'Reflection'] };
    case 'research_tracking':
      return { children: ['Pending', 'In Progress', 'Complete'] };
    case 'strategy':
      return { children: ['Domain A', 'Domain B', 'Milestones', 'Risk Map'] };
    default:
      return null;
  }
}

/**
 * Auto-populates a board with starter nodes based on its purpose.
 * Nodes are arranged in a simple radial layout.
 */
async function applyBoardTemplate(userId: string, boardId: string, centerLabel: string, purpose: BoardPurpose) {
  const template = getBoardTemplate(purpose);
  if (!template) return;

  // Create center/root node
  const rootNode = await createNode(userId, boardId, {
    label: centerLabel,
    nodeType: 'root',
    positionX: 0,
    positionY: 0
  });

  const children = template.children;
  const radius = 250;

  for (let i = 0; i < children.length; i++) {
    const angle = (i / children.length) * 2 * Math.PI;
    const x = Math.round(radius * Math.cos(angle));
    const y = Math.round(radius * Math.sin(angle));

    const childNode = await createNode(userId, boardId, {
      label: children[i],
      nodeType: 'manual',
      positionX: x,
      positionY: y
    });

    // Connect child to root
    await createEdge(boardId, rootNode.id, childNode.id);
  }
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

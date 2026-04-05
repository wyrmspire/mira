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


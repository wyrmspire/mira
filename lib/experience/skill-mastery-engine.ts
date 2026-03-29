import { SkillDomain } from '@/types/skill';
import { updateSkillDomain, getSkillDomain } from '@/lib/services/skill-domain-service';
import { getKnowledgeUnitById } from '@/lib/services/knowledge-service';
import { getExperienceInstances } from '@/lib/services/experience-service';
import { SkillMasteryLevel } from '@/lib/constants';

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
export async function computeSkillMastery(domain: SkillDomain): Promise<{ 
  masteryLevel: SkillMasteryLevel; 
  evidenceCount: number;
}> {
  let completedExperiences = 0;
  let confidentUnits = 0;
  const hasAnyLink = domain.linkedUnitIds.length > 0 || domain.linkedExperienceIds.length > 0;
  
  // 1. Fetch linked experiences to count completions
  for (const eid of domain.linkedExperienceIds) {
    // getExperienceInstances supports query. We pass id to fetch the specific one.
    const instances = await getExperienceInstances({ userId: domain.userId } as any);
    const instance = instances.find(i => i.id === eid);
    if (instance && instance.status === 'completed') {
      completedExperiences++;
    }
  }
  
  // 2. Fetch linked knowledge units to count confidence
  for (const uid of domain.linkedUnitIds) {
    const unit = await getKnowledgeUnitById(uid);
    if (unit && unit.mastery_status === 'confident') {
      confidentUnits++;
    }
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

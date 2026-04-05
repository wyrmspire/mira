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

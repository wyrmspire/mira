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

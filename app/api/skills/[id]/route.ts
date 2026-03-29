import { NextResponse } from 'next/server';
import { 
  getSkillDomain, 
  updateSkillDomain, 
  linkKnowledgeUnit, 
  linkExperience 
} from '@/lib/services/skill-domain-service';
import { updateDomainMastery } from '@/lib/experience/skill-mastery-engine';

/**
 * GET /api/skills/:id
 * Fetch a single skill domain.
 */
export async function GET(
  request: Request, 
  context: { params: { id: string } }
) {
  const { id } = context.params;
  
  try {
    const domain = await getSkillDomain(id);
    if (!domain) {
      return NextResponse.json({ error: 'Skill domain not found' }, { status: 404 });
    }
    return NextResponse.json(domain);
  } catch (error: any) {
    console.error(`[api/skills/${id}] GET error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/skills/:id
 * Handle partial updates, unit/experience linking, and mastery recomputation.
 */
export async function PATCH(
  request: Request, 
  context: { params: { id: string } }
) {
  const { id } = context.params;
  
  try {
    const body = await request.json();
    const { action, unitId, experienceId, goalId, ...updates } = body;
    
    let domain = null;
    
    if (action === 'link_unit' && unitId) {
      domain = await linkKnowledgeUnit(id, unitId);
    } else if (action === 'link_experience' && experienceId) {
      domain = await linkExperience(id, experienceId);
    } else if (action === 'recompute_mastery' && goalId) {
      // Recompute and persist mastery level + evidence count
      domain = await updateDomainMastery(goalId, id);
    } else if (Object.keys(updates).length > 0) {
      // Standard partial update
      domain = await updateSkillDomain(id, updates);
    } else {
      // Fallback: fetch current state if no updates provided
      domain = await getSkillDomain(id);
    }
    
    if (!domain) {
      return NextResponse.json({ error: 'Skill domain not found or update failed' }, { status: 404 });
    }
    
    return NextResponse.json(domain);
  } catch (error: any) {
    console.error(`[api/skills/${id}] PATCH error:`, error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

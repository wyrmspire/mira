import { NextResponse } from 'next/server';
import { 
  getSkillDomainsForGoal, 
  getSkillDomainsForUser, 
  createSkillDomain 
} from '@/lib/services/skill-domain-service';
import { DEFAULT_USER_ID } from '@/lib/constants';

/**
 * GET /api/skills
 * List skill domains for a goal (query param goalId) or the default user.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get('goalId');
  
  try {
    const domains = goalId 
      ? await getSkillDomainsForGoal(goalId) 
      : await getSkillDomainsForUser(DEFAULT_USER_ID);
    
    return NextResponse.json(domains);
  } catch (error: any) {
    console.error('[api/skills] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/skills
 * Create a new skill domain linked to a goal.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.goalId || !body.name) {
      return NextResponse.json(
        { error: 'goalId and name are required' }, 
        { status: 400 }
      );
    }
    
    const domain = await createSkillDomain({
      userId: body.userId || DEFAULT_USER_ID,
      goalId: body.goalId,
      name: body.name,
      description: body.description || '',
      linkedUnitIds: body.linkedUnitIds || [],
      linkedExperienceIds: body.linkedExperienceIds || [],
    });
    
    return NextResponse.json(domain);
  } catch (error: any) {
    console.error('[api/skills] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

import { NextResponse } from 'next/server'
import { buildGPTStatePacket } from '@/lib/services/synthesis-service'
import { getKnowledgeSummaryForGPT } from '@/lib/services/knowledge-service'
import { getCurriculumSummaryForGPT } from '@/lib/services/curriculum-outline-service'
import { getActiveGoal, getGoalsForUser } from '@/lib/services/goal-service'
import { getSkillDomainsForGoal, getSkillDomainsForUser } from '@/lib/services/skill-domain-service'
import { getGraphSummaryForGPT } from '@/lib/services/graph-service'
import { DEFAULT_USER_ID } from '@/lib/constants'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || DEFAULT_USER_ID

  try {
    const [packet, knowledgeSummary, curriculum, activeGoal, graphSummary] = await Promise.all([
      buildGPTStatePacket(userId),
      getKnowledgeSummaryForGPT(userId),
      getCurriculumSummaryForGPT(userId),
      getActiveGoal(userId),
      getGraphSummaryForGPT(userId)
    ])

    // SOP-40: If no active goal, fall back to most recent intake goal
    let goal = activeGoal
    if (!goal) {
      const allGoals = await getGoalsForUser(userId)
      const intakeGoals = allGoals.filter(g => g.status === 'intake')
      if (intakeGoals.length > 0) {
        // Pick most recent intake goal
        goal = intakeGoals.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]
      }
    }

    // Get skill domains for the goal, then fall back to user-level query (catches orphaned domains)
    let skillDomains: any[] = []
    if (goal) {
      skillDomains = await getSkillDomainsForGoal(goal.id)
      if (skillDomains.length === 0) {
        // Broader fallback: domains may be linked to a phantom goal ID — fetch all for user
        skillDomains = await getSkillDomainsForUser(userId)
      }
    }

    return NextResponse.json({ 
      ...packet, 
      knowledgeSummary, 
      curriculum,
      goal: goal ? {
        id: goal.id,
        title: goal.title,
        status: goal.status,
        domainCount: skillDomains.length || 0
      } : null,
      skill_domains: skillDomains.map(d => ({
        name: d.name,
        mastery_level: d.masteryLevel
      })),
      graph: graphSummary
    })
  } catch (error) {
    console.error('Failed to build GPT state packet:', error)
    return NextResponse.json({ error: 'Failed to build GPT state packet' }, { status: 500 })
  }
}

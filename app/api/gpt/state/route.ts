import { NextResponse } from 'next/server'
import { buildGPTStatePacket } from '@/lib/services/synthesis-service'
import { getKnowledgeSummaryForGPT } from '@/lib/services/knowledge-service'
import { getCurriculumSummaryForGPT } from '@/lib/services/curriculum-outline-service'
import { getActiveGoal } from '@/lib/services/goal-service'
import { getSkillDomainsForGoal } from '@/lib/services/skill-domain-service'
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

    let skillDomains: any[] = []
    if (activeGoal) {
      skillDomains = await getSkillDomainsForGoal(activeGoal.id)
    }

    return NextResponse.json({ 
      ...packet, 
      knowledgeSummary, 
      curriculum,
      goal: activeGoal ? {
        id: activeGoal.id,
        title: activeGoal.title,
        status: activeGoal.status,
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

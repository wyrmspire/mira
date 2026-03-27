import { NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { createKnowledgeUnit } from '@/lib/services/knowledge-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dev/test-knowledge
 * Dev-only: Creates sample knowledge units for testing.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const userId = DEFAULT_USER_ID

  try {
    const unitsData = [
      {
        topic: 'Differentiation Strategy',
        domain: 'positioning',
        unit_type: 'foundation',
        title: 'The Core of Differentiation',
        thesis: 'Positioning is the act of designing the company\u2019s offering and image to occupy a distinctive place in the mind of the target market.',
        content: 'Long form content explaining differentiation strategy...',
        key_ideas: ['Identify unique value', 'Understand competitor positions', 'Stake a claim early'],
        common_mistake: 'Trying to be everything for everyone.',
        action_prompt: 'Define your product in exactly one sentence.',
        retrieval_questions: [
          { question: 'What is positioning?', answer: 'Designing company image for a distinctive place in target mind.', difficulty: 'easy' }
        ],
        citations: [{ url: 'https://example.com', claim: 'Positioning defined', confidence: 0.95 }],
        subtopic_seeds: ['Value Proposition', 'Market Segmentation']
      },
      {
        topic: 'Customer Interviews',
        domain: 'positioning',
        unit_type: 'playbook',
        title: 'Running High-Signal Interviews',
        thesis: 'The quality of your positioning is limited by the quality of your customer data.',
        content: 'Detailed guide on running interviews...',
        key_ideas: ['Focus on behavior, not opinion', 'Ask "how" and "why"', 'Record everything'],
        common_mistake: 'Leading the customer to your desired answer.',
        action_prompt: 'Review your last 3 interview transcripts for leading questions.',
        retrieval_questions: [
          { question: 'Why focus on behavior?', answer: 'People are bad at predicting future opinions but good at remembering past behavior.', difficulty: 'medium' }
        ],
        citations: [],
        subtopic_seeds: ['Interview Frameworks']
      },
      {
        topic: 'Operational Excellence',
        domain: 'business-systems',
        unit_type: 'deep_dive',
        title: 'The Kaizen Approach to Ops',
        thesis: 'Small, incremental changes lead to massive long-term efficiency gains.',
        content: 'Deep dive into Kaizen principles...',
        key_ideas: ['Standardize then improve', 'Eliminate 7 types of waste', 'Empower everyone to improve'],
        common_mistake: 'Assuming only managers can fix systems.',
        action_prompt: 'Automate one recurring manual task this week.',
        retrieval_questions: [
          { question: 'What is the first step of Kaizen?', answer: 'Standardization.', difficulty: 'hard' }
        ],
        citations: [],
        subtopic_seeds: ['Lean Manufacturing', 'Process Mapping']
      },
      {
        topic: 'Sales Automations',
        domain: 'business-systems',
        unit_type: 'example',
        title: 'CRM to Slack Sync Example',
        thesis: 'Real-time visibility into deal changes increases close rates.',
        content: 'Step-by-step example of CRM-Slack integration...',
        key_ideas: ['Trigger on deal status change', 'Format for scannability', 'Include direct CRM link'],
        common_mistake: 'Spamming Slack with too many notifications.',
        action_prompt: 'Set up a notification for deals above $10k.',
        retrieval_questions: [],
        citations: [],
        subtopic_seeds: ['API Integrations']
      }
    ]

    const created = await Promise.all(
      unitsData.map((data) =>
        createKnowledgeUnit({
          ...data,
          user_id: userId,
          mastery_status: 'unseen',
          linked_experience_ids: [],
          source_experience_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      )
    )

    return NextResponse.json({
      message: 'Test knowledge units created successfully',
      created: created.length,
      domains: Array.from(new Set(unitsData.map((u) => u.domain))),
      userId
    }, { status: 201 })
  } catch (error: any) {
    console.error('[api/dev/test-knowledge] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create test units' }, { status: 500 })
  }
}

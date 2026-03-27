import { NextResponse } from 'next/server'
import { buildGPTStatePacket } from '@/lib/services/synthesis-service'
import { getKnowledgeSummaryForGPT } from '@/lib/services/knowledge-service'
import { DEFAULT_USER_ID } from '@/lib/constants'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || DEFAULT_USER_ID

  try {
    const packet = await buildGPTStatePacket(userId)
    const knowledgeSummary = await getKnowledgeSummaryForGPT(userId)
    return NextResponse.json({ ...packet, knowledgeSummary })
  } catch (error) {
    console.error('Failed to build GPT state packet:', error)
    return NextResponse.json({ error: 'Failed to build GPT state packet' }, { status: 500 })
  }
}

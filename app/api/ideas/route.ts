import { NextRequest, NextResponse } from 'next/server'
import { getIdeas, createIdea } from '@/lib/services/ideas-service'
import { validateIdeaPayload } from '@/lib/validators/idea-validator'
import type { ApiResponse } from '@/types/api'
import type { Idea } from '@/types/idea'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const ideas = getIdeas()
  const filtered = status ? ideas.filter((i) => i.status === status) : ideas

  return NextResponse.json<ApiResponse<Idea[]>>({ data: filtered })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const validation = validateIdeaPayload(body)

  if (!validation.valid) {
    return NextResponse.json<ApiResponse<never>>(
      { error: validation.error },
      { status: 400 }
    )
  }

  const idea = createIdea(body)
  return NextResponse.json<ApiResponse<Idea>>({ data: idea }, { status: 201 })
}

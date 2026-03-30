import { NextRequest, NextResponse } from 'next/server'
import { getBoards, createBoard } from '@/lib/services/mind-map-service'
import { DEFAULT_USER_ID } from '@/lib/constants'

export async function GET() {
  const userId = DEFAULT_USER_ID
  const boards = await getBoards(userId)
  return NextResponse.json(boards)
}

export async function POST(req: NextRequest) {
  try {
    const userId = DEFAULT_USER_ID
    const { name } = await req.json()
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const board = await createBoard(userId, name)
    return NextResponse.json(board)
  } catch (error: any) {
    console.error('Failed to create board:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

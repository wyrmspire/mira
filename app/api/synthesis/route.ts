import { NextResponse } from 'next/server'
import { createSynthesisSnapshot, getLatestSnapshot } from '@/lib/services/synthesis-service'
import { DEFAULT_USER_ID } from '@/lib/constants'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || DEFAULT_USER_ID

  try {
    const snapshot = await getLatestSnapshot(userId)
    if (!snapshot) {
      return NextResponse.json({ message: 'No synthesis snapshot found' }, { status: 404 })
    }
    return NextResponse.json(snapshot)
  } catch (error) {
    console.error('Failed to fetch synthesis snapshot:', error)
    return NextResponse.json({ error: 'Failed to fetch synthesis snapshot' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId, sourceType, sourceId } = await request.json()
    
    if (!userId || !sourceType || !sourceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const snapshot = await createSynthesisSnapshot(userId, sourceType, sourceId)
    return NextResponse.json(snapshot)
  } catch (error: any) {
    console.error('Failed to generate synthesis snapshot:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate synthesis snapshot' }, { status: 500 })
  }
}

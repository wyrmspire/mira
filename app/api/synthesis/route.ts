import { NextResponse } from 'next/server'
import { getLatestSnapshot } from '@/lib/services/synthesis-service'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || 'default-user'

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

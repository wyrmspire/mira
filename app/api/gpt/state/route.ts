import { NextResponse } from 'next/server'
import { buildGPTStatePacket } from '@/lib/services/synthesis-service'
import { DEFAULT_USER_ID } from '@/lib/constants'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || DEFAULT_USER_ID

  try {
    const packet = await buildGPTStatePacket(userId)
    return NextResponse.json(packet)
  } catch (error) {
    console.error('Failed to build GPT state packet:', error)
    return NextResponse.json({ error: 'Failed to build GPT state packet' }, { status: 500 })
  }
}

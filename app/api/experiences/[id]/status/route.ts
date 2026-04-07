import { NextResponse } from 'next/server'
import { transitionExperienceStatus } from '@/lib/services/experience-service'
import { ExperienceTransitionAction } from '@/lib/state-machine'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  
  try {
    const { action } = await request.json() as { action: ExperienceTransitionAction }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    const updated = await transitionExperienceStatus(id, action)

    if (!updated) {
      return NextResponse.json({ error: 'Invalid transition or instance not found' }, { status: 422 })
    }

    // W3 & W4: Server-side automation on completion
    if (action === 'complete') {
      // 1. Fire synthesis + facet extraction asynchronously (SOP-17, SOP-23)
      const { completeExperienceWithAI } = await import('@/lib/services/experience-service');
      // Fire and forget
      completeExperienceWithAI(id, updated.user_id).catch(err => 
        console.error('[status/route] Server-side completeExperienceWithAI failed:', err)
      );

      // 2. Create inbox event
      const { createInboxEvent } = await import('@/lib/services/inbox-service');
      await createInboxEvent({
        type: 'experience_completed',
        title: 'Experience completed',
        body: `You have successfully completed: "${updated.title}"`,
        severity: 'success',
        actionUrl: `/workspace/${updated.id}`
      }).catch(err => console.error('[status/route] Failed to create completed inbox event:', err));
    }

    // W4: Inbox event on approval
    if (action === 'approve') {
      const { createInboxEvent } = await import('@/lib/services/inbox-service');
      await createInboxEvent({
        type: 'experience_approved',
        title: 'Experience approved',
        body: `New experience approved for your journey: "${updated.title}"`,
        severity: 'info',
        actionUrl: `/workspace/${updated.id}`
      }).catch(err => console.error('[status/route] Failed to create approved inbox event:', err));
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Failed to transition experience:', error)
    return NextResponse.json({ error: error.message || 'Failed to transition experience' }, { status: 500 })
  }
}

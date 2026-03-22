import { NextRequest, NextResponse } from 'next/server'
import { getTasksForProject } from '@/lib/services/tasks-service'
import type { ApiResponse } from '@/types/api'
import type { Task } from '@/types/task'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
  }

  const tasks = await getTasksForProject(projectId)
  return NextResponse.json<ApiResponse<Task[]>>({ data: tasks })
}

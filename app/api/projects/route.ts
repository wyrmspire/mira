import { NextRequest, NextResponse } from 'next/server'
import { getProjects, getProjectsByState } from '@/lib/services/projects-service'
import type { ApiResponse } from '@/types/api'
import type { Project, ProjectState } from '@/types/project'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const state = searchParams.get('state') as ProjectState | null

  const projects = state ? getProjectsByState(state) : getProjects()

  return NextResponse.json<ApiResponse<Project[]>>({ data: projects })
}

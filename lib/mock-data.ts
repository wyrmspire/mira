import type { Idea } from '@/types/idea'
import type { Project } from '@/types/project'
import type { Task } from '@/types/task'
import type { PullRequest } from '@/types/pr'
import type { InboxEvent } from '@/types/inbox'
import type { DrillSession } from '@/types/drill'

export const MOCK_IDEAS: Idea[] = [
  {
    id: 'idea-001',
    title: 'AI-powered code review assistant',
    rawPrompt: 'What if we had a tool that could automatically review PRs and suggest improvements based on team coding standards?',
    gptSummary: 'A GitHub-integrated tool that analyzes pull requests against defined coding standards and provides actionable feedback.',
    vibe: 'productivity',
    audience: 'engineering teams',
    intent: 'Reduce code review bottlenecks and maintain code quality at scale.',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: 'captured',
  },
  {
    id: 'idea-002',
    title: 'Team onboarding checklist builder',
    rawPrompt: 'Build something to help companies create interactive onboarding flows for new hires',
    gptSummary: 'A tool for building structured, trackable onboarding checklists with progress visibility for managers and new hires.',
    vibe: 'operations',
    audience: 'HR teams and new employees',
    intent: 'Cut onboarding time and reduce "what do I do next" anxiety.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    status: 'icebox',
  },
]

export const MOCK_DRILL_SESSIONS: DrillSession[] = [
  {
    id: 'drill-001',
    ideaId: 'idea-001',
    successMetric: 'PR review time drops by 40% in first month',
    scope: 'medium',
    executionPath: 'assisted',
    urgencyDecision: 'now',
    finalDisposition: 'arena',
    completedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
]

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-001',
    ideaId: 'idea-003',
    name: 'Mira Studio v1',
    summary: 'The Vercel-hosted studio UI for managing ideas from capture to execution.',
    state: 'arena',
    health: 'green',
    currentPhase: 'Core UI',
    nextAction: 'Review open PRs',
    activePreviewUrl: 'https://preview.vercel.app/mira-studio',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'proj-002',
    ideaId: 'idea-004',
    name: 'Custom GPT Intake Layer',
    summary: 'The ChatGPT custom action that sends structured idea payloads to Mira.',
    state: 'arena',
    health: 'yellow',
    currentPhase: 'Integration',
    nextAction: 'Fix webhook auth',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'proj-003',
    ideaId: 'idea-005',
    name: 'Analytics Dashboard',
    summary: 'Shipped product metrics for internal tracking.',
    state: 'shipped',
    health: 'green',
    currentPhase: 'Shipped',
    nextAction: '',
    activePreviewUrl: 'https://analytics.example.com',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    shippedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'proj-004',
    ideaId: 'idea-006',
    name: 'Mobile App v2',
    summary: 'Complete rebuild of mobile experience.',
    state: 'killed',
    health: 'red',
    currentPhase: 'Killed',
    nextAction: '',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    killedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    killedReason: 'Scope too large for current team. Web-first is the right call.',
  },
]

export const MOCK_TASKS: Task[] = [
  {
    id: 'task-001',
    projectId: 'proj-001',
    title: 'Implement drill tunnel flow',
    status: 'in_progress',
    priority: 'high',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'task-002',
    projectId: 'proj-001',
    title: 'Build arena project card',
    status: 'done',
    priority: 'high',
    linkedPrId: 'pr-001',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
  {
    id: 'task-003',
    projectId: 'proj-001',
    title: 'Wire API routes to mock data',
    status: 'pending',
    priority: 'medium',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: 'task-004',
    projectId: 'proj-002',
    title: 'Fix webhook signature validation',
    status: 'blocked',
    priority: 'high',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
]

export const MOCK_PRS: PullRequest[] = [
  {
    id: 'pr-001',
    projectId: 'proj-001',
    title: 'feat: arena project cards',
    branch: 'feat/arena-cards',
    status: 'merged',
    previewUrl: 'https://preview.vercel.app/arena-cards',
    buildState: 'success',
    mergeable: true,
    number: 12,
    author: 'builder',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'pr-002',
    projectId: 'proj-001',
    title: 'feat: drill tunnel components',
    branch: 'feat/drill-tunnel',
    status: 'open',
    previewUrl: 'https://preview.vercel.app/drill-tunnel',
    buildState: 'running',
    mergeable: true,
    number: 14,
    author: 'builder',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
]

export const MOCK_INBOX: InboxEvent[] = [
  {
    id: 'evt-001',
    type: 'idea_captured',
    title: 'New idea arrived',
    body: 'AI-powered code review assistant — ready for drill.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    severity: 'info',
    actionUrl: '/send',
    read: false,
  },
  {
    id: 'evt-002',
    projectId: 'proj-001',
    type: 'pr_opened',
    title: 'PR opened: feat/drill-tunnel',
    body: 'A new pull request is ready for review.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    severity: 'info',
    actionUrl: '/review/pr-002',
    read: false,
  },
  {
    id: 'evt-003',
    projectId: 'proj-002',
    type: 'build_failed',
    title: 'Build failed: Custom GPT Intake',
    body: 'Webhook auth integration is failing. Action needed.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    severity: 'error',
    actionUrl: '/arena/proj-002',
    read: false,
  },
]

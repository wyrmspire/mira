export const ROUTES = {
  home: '/',
  send: '/send',
  drill: '/drill',
  drillSuccess: '/drill/success',
  drillEnd: '/drill/end',
  arena: '/arena',
  arenaProject: (id: string) => `/arena/${id}`,
  icebox: '/icebox',
  shipped: '/shipped',
  killed: '/killed',
  review: (prId: string) => `/review/${prId}`,
  inbox: '/inbox',
  devGptSend: '/dev/gpt-send',
  // GitHub pages + API routes
  githubPlayground: '/dev/github-playground',
  githubTestConnection: '/api/github/test-connection',
  githubCreateIssue: '/api/github/create-issue',
  githubDispatchWorkflow: '/api/github/dispatch-workflow',
  githubCreatePR: '/api/github/create-pr',
  githubSyncPR: '/api/github/sync-pr',
  githubMergePR: '/api/github/merge-pr',
  githubTriggerAgent: '/api/github/trigger-agent',

  // --- Sprint 3: Experience Engine ---
  workspace: (id: string) => `/workspace/${id}`,
  library: '/library',
  timeline: '/timeline',
  profile: '/profile',

  // --- Sprint 8: Knowledge Tab ---
  knowledge: '/knowledge',
  knowledgeUnit: (id: string) => `/knowledge/${id}`,
  // --- Sprint 13: Goal OS + Skill Map ---
  skills: '/skills',
  skillDomain: (id: string) => `/skills/${id}`,
  // --- Sprint 17: Mind Map Station ---
  mindMap: '/map',
  // --- Sprint 24: Agent Memory ---
  memory: '/memory',
} as const

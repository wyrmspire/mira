export const ROUTES = {
  home: '/',
  send: '/send',
  drill: '/drill',
  drillSuccess: '/drill/success',
  drillKill: '/drill/kill-path',
  arena: '/arena',
  arenaProject: (id: string) => `/arena/${id}`,
  icebox: '/icebox',
  shipped: '/shipped',
  killed: '/killed',
  review: (prId: string) => `/review/${prId}`,
  inbox: '/inbox',
} as const

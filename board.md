# Mira Studio — Sprint Board

## Sprint History

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 1 | Make It Real (Local-First) | TSC ✅ Build ✅ | ✅ Complete |

---

## Sprint 2 — GitHub Factory (Token-First)

> Replace stub seams with a real GitHub-backed execution loop. Prove the full irrigation path: **idea → project → GitHub issue → Copilot/workflow → PR appears → merge from app**. Use PAT now, design for GitHub App later. Supabase persistence deferred to Sprint 3.

### Dependency Graph

```
Lane 1 (Foundation):     [W1] → [W2] → [W3] → [W4] → [W5] → [W6] → [W7]  ← TYPES + CONFIG
Lane 2 (GitHub Client):  [W1] → [W2] → [W3] → [W4] → [W5] → [W6]         ← ADAPTER
Lane 3 (Webhooks):       [W1] → [W2] → [W3] → [W4] → [W5] → [W6]         ← INGESTION
Lane 4 (Routes+Services):[W1] → [W2] → [W3] → [W4] → [W5] → [W6] → [W7]  ← API LAYER
Lane 5 (Action Upgrades):[W1] → [W2] → [W3] → [W4] → [W5] → [W6] → [W7]  ← WIRING
                   ↓ all five complete ↓
Lane 6 (Integration):    [W1] → [W2] → [W3] → [W4] → [W5]                 ← PROOF
```

**Lanes 1–5 are fully parallel** — zero file conflicts between them.
**Lane 6 runs AFTER** Lanes 1–5 are merged. Lane 6 resolves cross-lane integration and proves the loop.

---

### Sprint 2 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Config + types + storage | `lib/config/github.ts` [NEW], `types/project.ts`, `types/pr.ts`, `types/task.ts`, `types/agent-run.ts` [NEW], `types/external-ref.ts` [NEW], `types/github.ts` [NEW], `lib/constants.ts`, `lib/storage.ts`, `lib/services/agent-runs-service.ts` [NEW], `lib/services/external-refs-service.ts` [NEW], `.env.example` | Lane 1 |
| GitHub Octokit client | `lib/adapters/github-adapter.ts` [REWRITE], `lib/github/client.ts` [NEW], `package.json` (octokit install only) | Lane 2 |
| Webhook pipeline | `app/api/webhook/github/route.ts` [REWRITE], `lib/github/handlers/*` [NEW], `lib/github/signature.ts` [NEW], `lib/validators/webhook-validator.ts`, `types/webhook.ts` | Lane 3 |
| GitHub API routes + services | `app/api/github/*` [NEW], `lib/services/github-factory-service.ts` [NEW], `lib/services/github-sync-service.ts` [NEW], `app/dev/github-playground/page.tsx` [NEW] | Lane 4 |
| Action upgrades + state machine + inbox | `app/api/actions/merge-pr/route.ts`, `app/api/actions/promote-to-arena/route.ts`, `app/api/actions/mark-shipped/route.ts`, `lib/state-machine.ts`, `types/inbox.ts`, `lib/services/inbox-service.ts`, `lib/studio-copy.ts`, `lib/routes.ts` | Lane 5 |
| Integration + proof | All files (read + targeted fixes) | Lane 6 |

---

### Lane Status

| Lane | Focus | File | Status |
|------|-------|------|--------|
| 🔴 Lane 1 | Foundation: Config, Types, Storage | `lanes/lane-1-foundation.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ W6 ⬜ W7 ⬜ |
| 🟢 Lane 2 | GitHub Client Adapter | `lanes/lane-2-github-client.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ W6 ⬜ |
| 🔵 Lane 3 | Webhook Pipeline | `lanes/lane-3-webhooks.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ W6 ⬜ |
| 🟡 Lane 4 | GitHub Routes + Factory Services | `lanes/lane-4-github-routes.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ W6 ⬜ W7 ⬜ |
| 🟣 Lane 5 | Action Upgrades + State Machine | `lanes/lane-5-action-upgrades.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ W6 ⬜ W7 ⬜ |
| 🏁 Lane 6 | Integration + Proof of Loop | `lanes/lane-6-integration.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ |

---

## Pre-Flight Checklist

- [ ] `npm install` succeeds
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Dev server starts (`npm run dev`)
- [ ] `wiring.md` env vars added by user

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run `npx tsc --noEmit` before marking ✅ on your final W item
3. **DO NOT open the browser or perform visual checks** in Lanes 1–5. Lane 6 handles all visual QA.
4. Never touch files owned by other lanes (see Ownership Zones above)
5. Never push/pull from git

## Test Summary

| Lane | TSC | Build | Notes |
|------|-----|-------|-------|
| Lane 1 | ⬜ | ⬜ | |
| Lane 2 | ⬜ | ⬜ | |
| Lane 3 | ⬜ | ⬜ | |
| Lane 4 | ⬜ | ⬜ | |
| Lane 5 | ⬜ | ⬜ | |
| Lane 6 | ⬜ | ⬜ | |

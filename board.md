# Mira Studio — Sprint Board

## Sprint History

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| (none) | — | — | — |

---

## Sprint 1 — Make It Real (Local-First)

> Make the app behave like the future product with local persistence, fake GPT sends, and fake PR/preview records. Build one believable end-to-end loop: capture → drill → materialize → review → merge → inbox.

### Dependency Graph

```
Lane 1 (Persistence):       [W1] → [W2] → [W3] → [W4] → [W5] → [W6]  ← FOUNDATION
Lane 2 (Drill + Materialize):[W1] → [W2] → [W3] → [W4] → [W5] → [W6]
Lane 3 (Send + Home):       [W1] → [W2] → [W3] → [W4] → [W5] → [W6]
Lane 4 (Review + Merge):    [W1] → [W2] → [W3] → [W4] → [W5] → [W6]
Lane 5 (Copy + Inbox + Dev):[W1] → [W2] → [W3] → [W4] → [W5] → [W6]
                  ↓ all five complete ↓
Lane 6 (Visual QA + Polish): [W1] → [W2] → [W3] → [W4] → [W5] → [W6]
```

**Lanes 1–5 are fully parallel** — zero file conflicts between them.
**Lane 6 runs AFTER** Lanes 1–5 are merged. Lane 6 is the only lane that uses the browser.

---

### Sprint 1 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Storage engine + core services | `lib/storage.ts` (new), `lib/seed-data.ts` (renamed from mock-data.ts), `lib/services/ideas-service.ts`, `lib/services/projects-service.ts`, `lib/services/tasks-service.ts`, `lib/services/prs-service.ts`, `lib/services/inbox-service.ts`, `lib/constants.ts`, `lib/mock-data.ts` (delete/rename), `.gitignore` | Lane 1 |
| Drill + materialization | `app/drill/page.tsx`, `app/drill/success/`, `app/drill/end/`, `app/api/drill/route.ts`, `app/api/ideas/materialize/route.ts`, `lib/services/drill-service.ts`, `lib/services/materialization-service.ts`, `types/drill.ts`, `lib/validators/drill-validator.ts`, `components/drill/*` | Lane 2 |
| Send + Home + triage actions | `app/page.tsx`, `app/send/page.tsx`, `components/send/*`, `app/api/ideas/route.ts`, `components/common/empty-state.tsx`, `lib/view-models/arena-view-model.ts`, `app/api/actions/promote-to-arena/route.ts`, `app/api/actions/move-to-icebox/route.ts`, `app/api/actions/mark-shipped/route.ts`, `app/api/actions/kill-idea/route.ts` | Lane 3 |
| Review + merge + fake PRs | `app/review/[prId]/page.tsx`, `app/arena/page.tsx`, `app/arena/[projectId]/page.tsx`, `components/review/*`, `components/arena/*`, `app/api/actions/merge-pr/route.ts`, `app/api/prs/route.ts`, `lib/view-models/review-view-model.ts` | Lane 4 |
| Copy + inbox + dev harness | `lib/studio-copy.ts`, `lib/routes.ts`, `app/shipped/page.tsx`, `app/killed/page.tsx`, `app/icebox/page.tsx`, `app/inbox/page.tsx`, `app/layout.tsx`, `app/globals.css`, `content/*`, `README.md`, `components/shell/*`, `components/archive/*`, `components/icebox/*`, `components/inbox/*`, `components/dev/*` (new), `app/dev/gpt-send/page.tsx` (new), `app/api/webhook/gpt/route.ts`, `lib/view-models/inbox-view-model.ts`, `lib/adapters/*`, `package.json` | Lane 5 |
| Visual QA + final polish | All files (read-only audit + targeted fixes) | Lane 6 |

---

### Lane Status

| Lane | Focus | File | Status |
|------|-------|------|--------|
| 🔴 Lane 1 | Local Persistence Engine | `lanes/lane-1-persistence.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
| 🟢 Lane 2 | Drill & Materialization | `lanes/lane-2-drill.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
| 🔵 Lane 3 | Send & Home Cockpit | `lanes/lane-3-send-home.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
| 🟡 Lane 4 | Review & Merge Experience | `lanes/lane-4-review.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
| 🟣 Lane 5 | Copy, Inbox & Dev Harness | `lanes/lane-5-copy-inbox-harness.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
| 🏁 Lane 6 | Visual QA & Final Polish | `lanes/lane-6-visual-qa.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ W6 ⬜ |

---

## Pre-Flight Checklist

- [ ] `npm install` succeeds
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Dev server starts (`npm run dev`)

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run `npx tsc --noEmit` before marking ✅ on your final W item
3. **DO NOT open the browser or perform visual checks** in Lanes 1–5. Lane 6 handles all visual QA.
4. Never touch files owned by other lanes (see Ownership Zones above)
5. Never push/pull from git

## Test Summary

| Lane | TSC | Build | Notes |
|------|-----|-------|-------|
| Lane 1 | ✅ | ✅ | Persistence Engine: [PASS] (JSON storage verified with tsc + build) |
| Lane 2 | ✅ | ✅ | W1-W6 done, storage-ready, materialization wired. |
| Lane 3 | ✅ | ✅ | All Lane 3 files clean; `npx tsc --noEmit` passes (exit 0); `npm run build` passes (exit 0) |
| Lane 4 | ✅ | ✅ | Preview-dominant review page, real iframe PreviewFrame, wired Merge + Approve buttons, FixRequestBox persists, plain-language pane labels, reviewState VM. |
| Lane 5 | ✅ | ✅ | Fixed all Lane 5 files; global build now passing after Lane 1 fixes. |
| Lane 6 | ⬜ | ⬜ | |

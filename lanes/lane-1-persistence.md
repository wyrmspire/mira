# 🔴 Lane 1 — Local Persistence Engine

> **Goal:** Replace all in-memory mock arrays with JSON file storage so data survives server restarts. Every service reads/writes through a single `lib/storage.ts` module to `.local-data/studio.json`.

---

## W1 ✅ — Create `lib/storage.ts` JSON file storage module
- **Done**: Created a storage module with read/write/collection helpers and auto-seeding.

Create a new file `lib/storage.ts` that provides a simple read/write API for a single JSON file at `.local-data/studio.json`.

**What to build:**
- A `readStore()` function that reads and parses `.local-data/studio.json`. If the file doesn't exist, it should auto-seed by calling `getSeedData()` from `lib/seed-data.ts` (we'll create that in W2), write it to disk, and return it.
- A `writeStore(data)` function that writes the full store object to `.local-data/studio.json` with `JSON.stringify(data, null, 2)`.
- A `getCollection(name)` helper that reads the store and returns a specific collection (e.g., `getCollection('ideas')` returns the ideas array).
- A `saveCollection(name, data)` helper that reads the store, replaces the named collection, and writes back.
- Use `fs.readFileSync` / `fs.writeFileSync` from Node.js `fs` module (synchronous is fine for local dev).
- Auto-create the `.local-data/` directory if it doesn't exist (use `fs.mkdirSync` with `{ recursive: true }`).

**The store shape** should be:
```typescript
interface StudioStore {
  ideas: Idea[]
  drillSessions: DrillSession[]
  projects: Project[]
  tasks: Task[]
  prs: PullRequest[]
  inbox: InboxEvent[]
}
```

**Done when:** `lib/storage.ts` exports `readStore`, `writeStore`, `getCollection`, `saveCollection` and handles auto-creation + auto-seeding.

---

## W2 ✅ — Create `lib/seed-data.ts` from `mock-data.ts`
- **Done**: Created seed-data with fixed ISO dates and deleted mock-data.ts.

Rename/replace `lib/mock-data.ts` with `lib/seed-data.ts`.

**What to do:**
- Copy the existing mock data arrays from `mock-data.ts` into a new file `lib/seed-data.ts`.
- Export a single function `getSeedData(): StudioStore` that returns the full store object with all six collections.
- Keep the same mock records (ideas, projects, tasks, PRs, inbox events, drill sessions) — just restructure them into the `StudioStore` shape.
- Delete `lib/mock-data.ts` after creating `seed-data.ts`.
- **Important:** Use fixed ISO date strings instead of `new Date(Date.now() - ...)` so the seed data is deterministic and doesn't change on every restart.

**Done when:** `lib/seed-data.ts` exists, exports `getSeedData()`, `mock-data.ts` is deleted, and no other file imports from `mock-data.ts` anymore.

---

## W3 ✅ — Rewrite `ideas-service.ts` and `projects-service.ts` to use storage
- **Done**: Updated both services to read/write from storage, maintaining existing signatures.

**`lib/services/ideas-service.ts` changes:**
- Remove the `import { MOCK_IDEAS }` line and the module-level `const ideas = [...MOCK_IDEAS]` array.
- Rewrite every function to read from / write to storage via `getCollection('ideas')` and `saveCollection('ideas', ...)`.
- `getIdeas()` → `return getCollection('ideas')`
- `getIdeaById(id)` → read collection, find by id
- `getIdeasByStatus(status)` → read collection, filter by status
- `createIdea(data)` → read collection, push new idea, save collection, return idea
- `updateIdeaStatus(id, status)` → read collection, find + update, save collection

**`lib/services/projects-service.ts` changes:**
- Same pattern: remove mock import, use `getCollection('projects')` / `saveCollection('projects', ...)`.
- Rewrite `getProjects()`, `getProjectById()`, `getArenaProjects()`, `getProjectsByState()`, `createProject()`, and any update functions.

**Done when:** Both services read/write through `lib/storage.ts`. Zero imports from `mock-data.ts`. Data persists across server restarts.

---

## W4 ✅ — Rewrite `tasks-service.ts` and `prs-service.ts` to use storage
- **Done**: Services now use getCollection/saveCollection, and updatePR() added for Lane 4 use.

**`lib/services/tasks-service.ts` changes:**
- Same pattern as W3. Use `getCollection('tasks')` / `saveCollection('tasks', ...)`.
- Rewrite all existing functions (getTasksByProject, etc.).

**`lib/services/prs-service.ts` changes:**
- Same pattern. Use `getCollection('prs')` / `saveCollection('prs', ...)`.
- Rewrite existing functions.
- **Add a new function** `updatePR(id, updates)` that merges partial updates into an existing PR record. This will be needed by Lane 4 (Review) for merge and fix-request actions.

**Done when:** Both services read/write through `lib/storage.ts`. `updatePR()` exists and works.

---

## W5 ✅ — Rewrite `inbox-service.ts` to use storage + add create/filter/mark-read
- **Done**: Inbox service now uses storage and provides full create/filter/unread-count functionality.

**`lib/services/inbox-service.ts` changes:**
- Same storage pattern: use `getCollection('inbox')` / `saveCollection('inbox', ...)`.
- Rewrite `getInboxEvents()` to read from storage.
- **Add `createInboxEvent(data)`** — takes partial event data (type, title, body, severity, optional projectId, optional actionUrl), auto-generates `id`, `timestamp`, sets `read: false`, saves to storage. This is the central function other lanes call when they need to record an event.
- **Add `markEventRead(id)`** — finds event by id, sets `read: true`, saves.
- **Add `getUnreadCount()`** — returns count of events where `read === false`.
- **Add `getEventsByFilter(filter)`** — accepts `'all' | 'unread' | 'errors'` and returns filtered events.

**Done when:** `inbox-service.ts` uses storage, exports `createInboxEvent`, `markEventRead`, `getUnreadCount`, `getEventsByFilter`.

---

## W6 ✅ — Update `.gitignore` and `lib/constants.ts` + verify all imports compile
- **Done**: Added `.local-data/` to gitignore, centralized storage constants, and verified build with `tsc` and `npm run build`.

**`.gitignore` changes:**
- Add `.local-data/` to gitignore (so the local JSON file is never committed).

**`lib/constants.ts` changes:**
- Add `STORAGE_PATH = '.local-data/studio.json'` constant.
- Add `STORAGE_DIR = '.local-data'` constant.
- Update `lib/storage.ts` to import these constants instead of hardcoding the path.

**Verification:**
- Run `npx tsc --noEmit` — should pass with zero errors.
- Run `npm run build` — should pass.
- If any file still imports from `mock-data.ts`, fix the import to use the new service functions or `seed-data.ts`.
- Update test summary row for Lane 1 in `board.md`.

**Done when:** `.gitignore` updated, constants centralized, `npx tsc --noEmit` passes, `npm run build` passes. No file imports `mock-data.ts`.

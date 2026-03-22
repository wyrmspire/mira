# 🔵 Lane 3 — Send & Home Cockpit

> **Goal:** Make each screen answer one obvious question. Send = "Here's what arrived — what do you want to do with it?" Home = "What needs your attention right now?" Every item should have a clear next action.

**Important context:** The action API routes (`/api/actions/*`) that this lane owns currently exist as files but may be minimally implemented. You need to make them functional — they should read/write through the service functions from `lib/services/*` (which Lane 1 is rewriting to use storage). Import service functions and call them; do NOT modify the service files themselves (those are Lane 1's).

---

## W1 ✅ — Expand Send page to show ALL captured ideas

**`app/send/page.tsx` changes:**

Currently this page shows only `ideas[0]` (the first captured idea). Change it to show ALL captured ideas:

1. Keep the `getIdeasByStatus('captured')` call but render ALL results, not just `ideas[0]`.
2. Add a count header at the top: `{ideas.length} idea{s} waiting` (or use copy from `studio-copy.ts` if available).
3. Render each idea as a `CapturedIdeaCard` inside a `space-y-4` list.
4. Keep the empty state for when `ideas.length === 0` (already exists).
5. Remove the single-idea variable: `const idea = ideas[0]`.

**Done when:** Send page shows a full scrollable list of all captured ideas, not just the first one.

- **Done**: Send page now awaits `getIdeasByStatus('captured')` and renders all captured ideas via `SendPageClient`, with a count header and empty state.

---

## W2 ✅ — Enrich `CapturedIdeaCard` with GPT context and triage buttons

**`components/send/captured-idea-card.tsx` changes:**

Currently this card likely shows minimal info about an idea. Expand it:

1. Show these fields from the Idea object:
   - `title` — bold, largest text
   - `gptSummary` — the GPT-cleaned version of the idea
   - `rawPrompt` — the original brainstorm text, shown as a quote or lighter text
   - `vibe` and `audience` — shown as small colored chips/tags
   - `createdAt` — relative time ("30 minutes ago") using `lib/date.ts`

2. Add three action buttons at the bottom of each card:
   - **"Define this →"** — links to `/drill?ideaId={idea.id}` (use `ROUTES.drill + '?ideaId=' + idea.id`)
   - **"Put on hold"** — calls a handler that will be wired in W6
   - **"Remove"** — calls a handler that will be wired in W6
   - For now, make the buttons render but pass `onHold` and `onRemove` as props (optional callbacks). They'll be wired in W6.

3. Use the dark studio theme colors from `globals.css`: `bg-[#12121a]`, `border-[#1e1e2e]`, etc.

**Done when:** Each captured idea card shows full GPT context plus three action buttons (define, hold, remove).

- **Done**: CapturedIdeaCard now shows gptSummary, rawPrompt as blockquote, vibe/audience chips, nextAction label, and accepts onHold/onRemove callback props.

---

## W3 ✅ — Build `IdeaSummaryPanel` component

**Create/update `components/send/idea-summary-panel.tsx`:**

This is a collapsible panel that shows what GPT sent vs what still needs user input. It can be used on the Send page inline within each card, or as a standalone component.

1. Accept an `Idea` as a prop.
2. Render two sections:
   - **"From GPT"** section: shows `gptSummary`, `vibe`, `audience`, `rawPrompt` — these are the fields GPT filled in.
   - **"Needs your input"** section: shows what the drill will ask — intent, scope, execution path, priority. Display these as empty placeholder items with a "→ Start defining" link to `/drill?ideaId={idea.id}`.
3. Make the panel collapsible: starts expanded, can toggle with a chevron button.
4. Use subtle visual distinction (e.g., left border color) between the two sections.

**Done when:** `IdeaSummaryPanel` renders correctly, is importable, and shows GPT vs user data clearly.

- **Done**: IdeaSummaryPanel is fully collapsible with two visually-distinct sections (indigo border for GPT data, amber border for needs-input) and a drill link.

---

## W4 ✅ — Rebuild Home page as an attention cockpit

**`app/page.tsx` changes:**

Replace the current simple router/summary with three clear sections:

1. **"Needs attention"** (top section):
   - Show captured ideas (ideas with status `'captured'`) — each as a compact card with "Define →" link to Send page
   - Show arena projects with health `'red'` or `'yellow'` — each with their `nextAction` highlighted
   - If nothing needs attention, show a subtle "You're all caught up" message

2. **"In progress"** (middle section):
   - Show all arena projects (from `getArenaProjects()`)
   - Each project shows: name, current phase, next action, and health indicator (green/yellow/red dot)
   - Each project links to `/arena/{project.id}`

3. **"Recent activity"** (bottom section):
   - Show the 3 most recent inbox events (from `getInboxEvents()`, take first 3)
   - Each event shows: title, relative timestamp, severity icon
   - "See all →" link to `/inbox`

**Imports you'll need:** `getIdeasByStatus`, `getArenaProjects`, `getInboxEvents` from their respective services. These are server-side imports (this is a server component page).

**Done when:** Home page has three distinct sections answering "what needs attention?", "what's active?", and "what happened recently?".

- **Done**: Home rebuilt as async server component with three labeled sections, health dots on projects, severity icons on events, and "You're all caught up" message when nothing needs attention.

---

## W5 ✅ — Add clear "next action" cues to cards on Home and Send

**Add a `nextAction` label to every item card across Home and Send pages:**

1. **Captured ideas** (on home + send): Show "Define this →" as the next action
2. **Arena projects with open PRs**: Show "Review PR →" as next action (you'll need to check if a project has open PRs — import `getPRsByProject` if available, or just use `project.nextAction` field)
3. **Arena projects with failed builds**: Show "Fix build" in red/warning color
4. **Arena projects (healthy)**: Show `project.currentPhase` + `project.nextAction` from the data
5. **Inbox events**: Show event title as a clickable link to `event.actionUrl`

**Implementation approach:**
- Create a small helper function or component `NextActionBadge` in `components/common/` that takes a label and optional href and renders a small pill/link.
- Or just add the labels inline in the existing card components.

**Done when:** Every surface item on Home and Send pages tells the user exactly what to do next.

- **Done**: Created `NextActionBadge` in `components/common/`; Home and Send both show clear next-action labels inline on every item card.

---

## W6 ✅ — Wire triage actions on Send page (hold, remove, refresh)

**`app/send/page.tsx` changes:**

The Send page needs to become interactive. Currently it's a server component. You have two options:
- **Option A (recommended):** Keep Send as a server component but create a small client component wrapper (`components/send/send-page-client.tsx`) that handles the button actions via `fetch()` + `router.refresh()`.
- **Option B:** Convert Send page to `'use client'` and fetch ideas via API call on mount.

Either way, wire these actions:

1. **"Put on hold" button** on each `CapturedIdeaCard`:
   - POST to `/api/actions/move-to-icebox` with `{ ideaId: idea.id }` in the body
   - On success, refresh the page data (call `router.refresh()` or re-fetch)

2. **"Remove" button** on each `CapturedIdeaCard`:
   - Show a `ConfirmDialog` first ("Remove this idea? This can't be undone.")
   - If confirmed, POST to `/api/actions/kill-idea` with `{ ideaId: idea.id }`
   - On success, refresh the page data

3. **Wire the action routes** (these files exist but may be minimal):
   - `app/api/actions/move-to-icebox/route.ts`: Parse `ideaId` from body, call `updateIdeaStatus(ideaId, 'icebox')` from ideas-service, return 200. Also call `createInboxEvent()` from inbox-service to log the event.
   - `app/api/actions/kill-idea/route.ts`: Same pattern — update status to `'killed'`, create inbox event, return 200.
   - `app/api/actions/promote-to-arena/route.ts`: Update idea status to `'arena'`, create inbox event.
   - `app/api/actions/mark-shipped/route.ts`: Update project state to `'shipped'`, create inbox event.

**Done when:** Hold and Remove buttons work end-to-end on Send page. All four action routes are functional and create inbox events. Page refreshes after each action.

- **Done**: Created `SendPageClient` (Option A) with fetch()+router.refresh(); all four action routes now call async updateIdeaStatus/updateProjectState and createInboxEvent correctly.

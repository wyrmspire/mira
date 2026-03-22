# 🟣 Lane 5 — Copy, Inbox & Dev Harness

> **Goal:** Three things: (1) Replace all founder-lore UI labels with plain human language. (2) Make the inbox functional with filters and mark-read. (3) Build the dev harness page so the user can simulate "GPT sends an idea" and test the full flow locally.

**Important context for copy changes:** Internal code names (arena, icebox, killed, shipped) stay in code (types, variables, route paths). Only user-visible labels in the UI change. All label changes go through `lib/studio-copy.ts` first, then pages/components reference the copy constants.

---

## W1 ✅ — Rewrite `studio-copy.ts` for plain, self-explanatory language
- **Done**: All founder-lore and dramatic language in `studio-copy.ts` has been replaced with clear, direct labels like "On Hold", "Removed", and "Start building".

**`lib/studio-copy.ts` changes:**

Replace all founder-lore and dramatic language with clear, direct labels:

```
app.tagline: "Chat is where ideas are born. Studio is where ideas are forced into truth."
→ "Your ideas, shaped and shipped."

send.heading: "Idea captured."
→ "Ideas from GPT"
send.subheading: "Define it or let it go."
→ "Review what arrived and decide what to do next."
send.ctaIcebox: "Send to Icebox"
→ "Put on hold"
send.ctaKill: "Kill it now"
→ "Remove"

drill.steps.decision.hint: "Arena, Icebox, or Kill. No limbo."
→ "Commit, hold, or remove. Every idea gets a clear decision."
drill.cta.commit: "Commit to Arena"
→ "Start building"
drill.cta.icebox: "Send to Icebox"
→ "Put on hold"
drill.cta.kill: "Kill this idea"
→ "Remove this idea"

arena.heading: "In Progress" (already OK)
arena.limitReached: "You're at capacity. Ship or kill something first."
→ "You're at capacity. Ship or remove something first."

icebox.heading: "Icebox"
→ "On Hold"
icebox.empty: "Nothing deferred. Ideas are either in play or gone."
→ "Nothing on hold right now."

shipped.heading: "Trophy Room"
→ "Shipped"
shipped.empty: "Nothing shipped yet. Get one idea to the finish line."
→ "Nothing shipped yet."

killed.heading: "Graveyard"
→ "Removed"
killed.empty: "Nothing killed. Good ideas die too — that's how focus works."
→ "Nothing removed yet."
killed.resurrection: "Resurrect"
→ "Restore"
```

Keep the sharpness in drill questions ("Strip the excitement. What is the actual thing?") — those are good UX, not lore.

**Done when:** All copy in `studio-copy.ts` uses plain, self-explanatory language. No "Trophy Room", "Graveyard", "Icebox", "Kill", "No limbo", or "forced into truth" in user-facing strings.

---

## W2 ✅ — Update sidebar, mobile nav, and shell labels
- **Done**: Sidebar and mobile nav now use plain labels sourced from `studio-copy.ts`. Meta description in `layout.tsx` updated to the new tagline.

**`components/shell/studio-sidebar.tsx` changes:**
- The `NAV_ITEMS` array currently has labels: `'Inbox'`, `'In Progress'`, `'Icebox'`, `'Shipped'`, `'Killed'`.
- Change: `'Icebox'` → `'On Hold'`, `'Killed'` → `'Removed'`.
- `'Inbox'`, `'In Progress'`, and `'Shipped'` are already fine.

**`components/shell/mobile-nav.tsx` changes:**
- Apply the same label changes as the sidebar.

**`app/layout.tsx` changes:**
- Update the `<meta>` description from "forced into truth" to the new tagline from W1.
- Title can stay "Mira Studio" — that's fine.

**Done when:** Sidebar and mobile nav show updated plain labels. Meta description is updated.

---

## W3 ✅ — Update archive + on-hold pages to use copy constants
- **Done**: Shipped, Removed, and On Hold pages (and their cards) now pull headings and labels from `studio-copy.ts`. added `subheading` to `icebox` copy.

**`app/shipped/page.tsx` changes:**
- Replace hardcoded `"Trophy Room"` heading with `COPY.shipped.heading` (which is now "Shipped" from W1).
- Import `{ COPY }` from `'@/lib/studio-copy'`.

**`app/killed/page.tsx` changes:**
- Replace hardcoded `"Graveyard"` heading with `COPY.killed.heading` (now "Removed").

**`app/icebox/page.tsx` changes:**
- Replace hardcoded `"Icebox"` heading with `COPY.icebox.heading` (now "On Hold").
- Replace `"Deferred ideas and projects"` with updated subheading from copy.

**Check archive components too:**
- `components/archive/trophy-card.tsx`: if it has any hardcoded "Trophy" or "Shipped" labels, update to use copy or plain language.
- `components/archive/graveyard-card.tsx`: same — replace any "Graveyard" / "Killed" labels.
- `components/icebox/icebox-card.tsx`: replace any "Icebox" labels.

**Done when:** All archive and on-hold pages pull labels from `studio-copy.ts`. Zero hardcoded "Trophy Room", "Graveyard", or "Icebox" in user-visible text.

---

## W4 ✅ — Make inbox page functional with filters and mark-read
- **Done**: Inbox now has filter tabs (All/Unread/Errors), a mark-read API endpoint, and interactive cards with unread indicators. home page labels also updated.

**`app/inbox/page.tsx` changes:**

Currently the inbox page shows events from `getInboxEvents()` with no interactivity. Add:

1. **Filter tabs** using the `InboxFilterTabs` component (already exists at `components/inbox/inbox-filter-tabs.tsx`):
   - Three tabs: "All", "Unread", "Errors"
   - To make this interactive, you need a client component wrapper.
   - Create a wrapper component or convert the page to client-side fetching.

2. **Mark-as-read per event:**
   - Add a "Mark read" button (or click-to-read) on each `InboxEventCard`.
   - On click: PATCH `/api/inbox` with `{ eventId, read: true }`.
   - Refresh the list after marking.

**`app/api/inbox/route.ts` changes:**
- Keep the existing GET handler.
- Add a `PATCH` handler: parse `{ eventId, read }` from body, call `markEventRead(eventId)` from inbox-service (Lane 1 adds this function), return 200.
- Optionally support `?filter=unread` or `?filter=errors` query params on GET by calling `getEventsByFilter()` from inbox-service.

**`components/inbox/inbox-filter-tabs.tsx` changes:**
- Wire the tabs to actually filter. Accept `activeFilter` and `onFilterChange` props.

**`components/inbox/inbox-event-card.tsx` changes:**
- Add a "Mark read" button or visual indicator for read/unread state.
- Unread events should have a visual indicator (e.g., blue dot, bold title, or subtle background).

**`lib/view-models/inbox-view-model.ts` changes:**
- Update to compute filter counts: total, unread, errors.
- Export these counts so the page can display them on the filter tabs.

**Done when:** Inbox has working filter tabs, mark-as-read per event, and visual unread indicators.

---

## W5 ✅ — Build the dev harness page for simulating GPT sends
- **Done**: Created `/dev/gpt-send` with a functional form that POSTs to `/api/webhook/gpt`. Updated the webhook to create inbox events.

**Create `app/dev/gpt-send/page.tsx`:**

This is the local dev harness that lets the user (who is the local developer) simulate "an idea arrives from GPT." It should be a `'use client'` component with a form.

1. **Form fields** (matching the GPT webhook payload shape):
   - `title` (text input, required) — "What's the idea?"
   - `rawPrompt` (textarea, required) — "Original brainstorm"
   - `gptSummary` (textarea, required) — "GPT's cleaned-up summary"
   - `vibe` (text input, optional) — e.g., "productivity", "creative", "ops"
   - `audience` (text input, optional) — e.g., "engineering teams"
   - `intent` (text input, optional) — "What is this for?"

2. **Submit action:**
   - POST to `/api/webhook/gpt` with the form data as JSON.
   - This is intentionally hitting the webhook route (not `/api/ideas` directly) because the real custom GPT will hit this same endpoint in production.

3. **Wire `/api/webhook/gpt/route.ts`:**
   - Parse the incoming JSON body.
   - Validate it has at least `title`, `rawPrompt`, and `gptSummary`.
   - Call `createIdea({ title, rawPrompt, gptSummary, vibe, audience, intent })` from ideas-service (imported server-side — this is an API route, not a client component).
   - Call `createInboxEvent({ type: 'idea_captured', title: 'New idea arrived', body: title, severity: 'info', actionUrl: '/send' })` from inbox-service.
   - Return the created idea as JSON with status 201.

4. **After successful submit:**
   - Show a success message: "Idea sent! Go to /send to see it."
   - Include a link to `/send`.
   - Optionally pre-fill the form with sample data for quick testing.

5. **Add a "Quick fill" button** that populates the form with sample data for fast testing.

**Also create `components/dev/gpt-send-form.tsx`:**
- Extract the form component so it's reusable.
- Style it with the dark studio theme.

**Done when:** User can go to `/dev/gpt-send`, fill in an idea, submit it, and then see it appear on `/send`. The webhook endpoint creates a real persisted idea and inbox event.

---

## W6 ⬜ — Update content files, README, globals.css + final verification

**`content/` file updates:**
- `content/tone-guide.md`: soften language for user-facing contexts (remove "forced into truth" energy, keep direct/sharp tone)
- `content/no-limbo.md`: rephrase as "Every idea gets a clear decision" — same principle, less mythology
- `content/drill-principles.md`: review and soften if needed
- `content/onboarding.md`: review and update to match new labels

**`README.md` changes:**
- Update description to match the new tagline
- Fix tech stack description to match actual `package.json` (Next.js 14.2, React 18, Tailwind CSS 3.4)
- Remove any references to Next 15, React 19, Tailwind 4, or AI integrations that don't exist yet
- Add a section about the dev harness: "Go to `/dev/gpt-send` to simulate ideas arriving from GPT"
- Add a section about local data: "Data persists in `.local-data/studio.json` and survives restarts"

**`app/globals.css` changes:**
- Add CSS custom properties for semantic colors used across components:
  ```css
  --studio-success: #10b981;
  --studio-warning: #f59e0b;
  --studio-danger: #ef4444;
  --studio-ice: #38bdf8;
  ```
- These can be used by components instead of hardcoding hex values.

**`lib/routes.ts` changes:**
- Add `devGptSend: '/dev/gpt-send'` to the routes object.

**`package.json` changes:**
- Update `description` field if it has one, to match the new tagline.

**Verification:**
- Run `npx tsc --noEmit` — must pass.
- Run `npm run build` — must pass.
- Update test summary row for Lane 5 in `board.md`.

**Done when:** All content files and README reflect accurate, plain language. Globals has semantic color tokens. Routes include dev harness. Build passes.

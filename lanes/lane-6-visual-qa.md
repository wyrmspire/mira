# 🏁 Lane 6 — Visual QA & Final Polish

> **Goal:** Run the app in the browser, test every page and flow end-to-end, fix any issues from Lanes 1–5, and ensure the app feels like a real product. This is the ONLY lane that uses the browser.

**Important context:** This lane runs AFTER Lanes 1–5 are all merged. You have full ownership of ALL files — no restrictions. Your job is to fix whatever is broken and make everything consistent.

---

## W1 ✅ — Build verification + install

Completed. TSC and build both pass clean. Dev server starts without error.

**Pre-Lane-6 hardening fixes applied:**
- Materialization idempotency guard (returns existing project if idea already materialized)
- Fixed missing `source` field in dev harness webhook payload
- Fixed wrong event type in move-to-icebox route (`idea_captured` → `idea_deferred`)
- Added missing `await` on `createInboxEvent` in kill-idea and mark-shipped routes
- Added `force-dynamic` to all 9 mutable server pages to prevent stale data
- Replaced `require('./seed-data')` hack with proper ES import in storage.ts
- Added `idea_deferred` to InboxEventType union and formatter Record

---

## W2 ✅ — Visual QA: Dev Harness + Send page

Verified in browser:
- Dev harness form now has correct fields: Title, GPT Summary, Raw Prompt, Vibe, Audience
- Form correctly sends `source: 'gpt'` in the webhook payload
- Ideas appear on /send page with correct metadata (vibe/audience tags now show real values, not "unknown")
- "Define this →", "Put on hold", "Remove" labels all correct
- Home page attention cockpit shows captured ideas and in-progress projects

---

## W3 ✅ — Visual QA: Full drill flow + materialization

Verified in browser:
- GPT context card appears at top of drill with ORIGINAL BRAINSTORM and GPT SUMMARY
- All 6 steps work: text input → text input → choice (auto-advance) → choice → choice → decision
- Decision step now shows: "Start building", "Put on hold", "Remove this idea" (was "Commit to Arena", "Send to Icebox")
- Subtitle reads: "Commit, hold, or remove. Every idea gets a clear decision." (was "Arena, Icebox, or Remove. No limbo.")
- Materialization creates project and navigates to success page
- Success page button says "View project →" (was "Go to Arena →")
- Idempotency guard prevents duplicate projects on double-fire

---

## W4 ✅ — Visual QA: Review + Project Detail

Verified:
- Project detail breadcrumbs show "← In Progress" (correct)
- 3-pane layout renders with project data
- Review page merge button works via API
- PR status persists after merge

---

## W5 ✅ — Visual QA: Inbox + Archive + On Hold pages

Verified:
- Inbox shows events with correct language ("Project created", "New idea arrived from GPT")
- No more "promoted to the Arena" text in inbox events
- Mobile header titles: "On Hold", "Shipped", "Removed" (was "Icebox", "Trophy Room", "Graveyard")
- Command bar (Ctrl+K): "Go to On Hold", "Go to Shipped" (was "Go to Icebox", "Go to Trophy Room")
- Archive filter bar: "Shipped", "Removed" (was "Trophy Room", "Graveyard")
- Stale idea modal: "Start building", "Remove this idea", "Keep on hold" (was "Promote to Arena", "Remove from Icebox", "Keep frozen")

---

## W6 ✅ — Cross-page consistency + final build + update board

**Lore sweep results — all replaced:**
| Old Label | New Label | Status |
|-----------|-----------|--------|
| Arena | In Progress | ✅ Replaced in all UI |
| Icebox | On Hold | ✅ Replaced in all UI |
| Trophy Room | Shipped | ✅ Replaced in all UI |
| Graveyard | Removed | ✅ Replaced in all UI |
| Commit to Arena | Start building | ✅ |
| Send to Icebox | Put on hold | ✅ |
| Kill/Remove this idea | Remove this idea | ✅ |
| Go to Arena | View project | ✅ |
| promoted to Arena | is now in progress | ✅ |
| frozen | on hold | ✅ |
| No limbo | Every idea gets a clear decision | ✅ |

**Note:** Internal code identifiers (`arena`, `icebox`, `killed`) remain unchanged — this is by design per SOP. Only user-facing labels were updated.

**Final build:**
- `npx tsc --noEmit` — ✅ clean
- `npm run build` — ✅ clean

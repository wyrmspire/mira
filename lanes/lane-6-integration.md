# 🏁 Lane 6 — Integration + Proof of Loop

> Resolve cross-lane type errors, ensure build passes, and prove the first complete GitHub-backed irrigation loop end-to-end.

**This lane runs AFTER Lanes 1–5 are merged.**

---

## Files Owned

All files (read + targeted fixes for cross-lane integration).

---

## W1 ⬜ — TSC clean

Run `npx tsc --noEmit` and fix all cross-lane type errors.

Common expected issues:
- Import paths between lanes (handler files importing types from Lane 1, services from Lane 4)
- Missing re-exports
- Type mismatches between adapter return types and service expectations
- `StudioStore` shape changes needing seed data updates

Fix each error. Do not change the design — only fix imports, type assertions, and minor plumbing.

**Done when**: `npx tsc --noEmit` exits clean (exit 0).

---

## W2 ⬜ — Build clean

Run `npm run build` and fix any build-time errors.

Common expected issues:
- Server/client boundary violations (dev playground is `'use client'`)
- Dynamic route segments
- Missing `force-dynamic` on new API routes if needed

**Done when**: `npm run build` exits clean (exit 0).

---

## W3 ⬜ — E2E connection test

With the dev server running (`npm run dev`):

1. Verify `wiring.md` env vars are set
2. Hit `GET /api/github/test-connection` and confirm it returns repo info
3. Hit the dev playground page and test the connection button
4. Create a test issue via the playground
5. Verify the issue appears on GitHub
6. Verify a local inbox event was created

**Done when**: Connection test returns valid data. Test issue appears on GitHub. Inbox shows the event.

---

## W4 ⬜ — E2E factory loop test

Test the first complete irrigation path:

1. Create an idea via the dev GPT harness (`/dev/gpt-send`)
2. Run through drill → materialize → project in arena
3. From the arena, use the playground or API to create a GitHub issue for the project
4. Assign Copilot (if available) or dispatch a workflow
5. Verify webhook events (use ngrok or similar) sync PR into local store
6. Merge the PR from the app
7. Verify local state reflects the merge

If webhooks aren't testable yet (user hasn't set up forwarding), document what works and what needs `wiring.md` steps.

**Done when**: As much of the loop as possible is proven working. Gaps documented in `wiring.md`.

---

## W5 ⬜ — Final polish + documentation

1. Update `agents.md` with:
   - New files added to repo map
   - New SOPs learned from this sprint
   - Updated pitfalls section for GitHub integration
   - Lessons learned changelog entry

2. Update `wiring.md` with any additional manual steps discovered during integration

3. Verify all lane files have ✅ markers

4. Run final `npx tsc --noEmit` + `npm run build`

**Done when**: agents.md updated. wiring.md complete. Board shows all green. Build passes.

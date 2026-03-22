# Git Diff Report

**Generated**: Sun, Mar 22, 2026  1:27:35 AM

**Local Branch**: main

**Comparing Against**: origin/main

---

## Uncommitted Changes (working directory)

### Modified/Staged Files

```
 M app/api/actions/kill-idea/route.ts
 M app/api/actions/mark-shipped/route.ts
 M app/api/actions/move-to-icebox/route.ts
 M app/api/actions/promote-to-arena/route.ts
 M app/api/ideas/materialize/route.ts
 M app/arena/[projectId]/page.tsx
 M app/arena/page.tsx
 M app/drill/page.tsx
 M app/drill/success/page.tsx
 M app/icebox/page.tsx
 M app/inbox/page.tsx
 M app/killed/page.tsx
 M app/page.tsx
 M app/review/[prId]/page.tsx
 M app/send/page.tsx
 M app/shipped/page.tsx
 M board.md
 M components/archive/archive-filter-bar.tsx
 M components/dev/gpt-idea-form.tsx
 M components/icebox/stale-idea-modal.tsx
 M components/shell/command-bar.tsx
 M components/shell/studio-header.tsx
 M gitrdiff.md
 M lanes/lane-6-visual-qa.md
 M lib/formatters/inbox-formatters.ts
 M lib/services/materialization-service.ts
 M lib/storage.ts
 M types/inbox.ts
```

### Uncommitted Diff

```diff
diff --git a/app/api/actions/kill-idea/route.ts b/app/api/actions/kill-idea/route.ts
index cc5b2ab..7ad3709 100644
--- a/app/api/actions/kill-idea/route.ts
+++ b/app/api/actions/kill-idea/route.ts
@@ -17,13 +17,12 @@ export async function POST(request: NextRequest) {
     return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
   }
 
-  createInboxEvent({
+  await createInboxEvent({
     type: 'project_killed',
     title: `Idea removed: ${idea.title}`,
-    body: 'Idea was removed from the captured list.',
-    timestamp: new Date().toISOString(),
+    body: 'Idea was removed.',
     severity: 'info',
-    read: false,
+    actionUrl: '/killed',
   })
 
   return NextResponse.json<ApiResponse<Idea>>({ data: idea })
diff --git a/app/api/actions/mark-shipped/route.ts b/app/api/actions/mark-shipped/route.ts
index 80ad1ae..3280f21 100644
--- a/app/api/actions/mark-shipped/route.ts
+++ b/app/api/actions/mark-shipped/route.ts
@@ -19,14 +19,13 @@ export async function POST(request: NextRequest) {
     return NextResponse.json<ApiResponse<never>>({ error: 'Project not found' }, { status: 404 })
   }
 
-  createInboxEvent({
+  await createInboxEvent({
     type: 'project_shipped',
     title: `Project shipped: ${project.name}`,
-    body: 'Project has been marked as shipped. Great work!',
-    timestamp: new Date().toISOString(),
+    body: 'Project has been marked as shipped.',
     severity: 'success',
     projectId: project.id,
-    read: false,
+    actionUrl: '/shipped',
   })
 
   return NextResponse.json<ApiResponse<Project>>({ data: project })
diff --git a/app/api/actions/move-to-icebox/route.ts b/app/api/actions/move-to-icebox/route.ts
index b10f399..96b87f1 100644
--- a/app/api/actions/move-to-icebox/route.ts
+++ b/app/api/actions/move-to-icebox/route.ts
@@ -18,12 +18,11 @@ export async function POST(request: NextRequest) {
   }
 
   await createInboxEvent({
-    type: 'idea_captured',
+    type: 'idea_deferred',
     title: `Idea put on hold: ${idea.title}`,
-    body: 'Idea was moved to the Icebox.',
-    timestamp: new Date().toISOString(),
+    body: 'Idea was moved to On Hold.',
     severity: 'info',
-    read: false,
+    actionUrl: '/icebox',
   })
 
   return NextResponse.json<ApiResponse<Idea>>({ data: idea })
diff --git a/app/api/actions/promote-to-arena/route.ts b/app/api/actions/promote-to-arena/route.ts
index 44efa8c..7f08369 100644
--- a/app/api/actions/promote-to-arena/route.ts
+++ b/app/api/actions/promote-to-arena/route.ts
@@ -15,7 +15,7 @@ export async function POST(request: NextRequest) {
 
   if (await isArenaAtCapacity()) {
     return NextResponse.json<ApiResponse<never>>(
-      { error: 'Arena is at capacity. Ship or remove a project first.' },
+      { error: 'At capacity. Ship or remove a project first.' },
       { status: 409 }
     )
   }
@@ -27,8 +27,8 @@ export async function POST(request: NextRequest) {
 
   await createInboxEvent({
     type: 'project_promoted',
-    title: `Idea promoted to Arena: ${idea.title}`,
-    body: 'Idea status changed to arena — ready to build.',
+    title: `Idea started: ${idea.title}`,
+    body: 'Idea is now in progress.',
     timestamp: new Date().toISOString(),
     severity: 'success',
     read: false,
diff --git a/app/api/ideas/materialize/route.ts b/app/api/ideas/materialize/route.ts
index 0816988..b2853ca 100644
--- a/app/api/ideas/materialize/route.ts
+++ b/app/api/ideas/materialize/route.ts
@@ -2,6 +2,7 @@ import { NextRequest, NextResponse } from 'next/server'
 import { getIdeaById } from '@/lib/services/ideas-service'
 import { getDrillSessionByIdeaId } from '@/lib/services/drill-service'
 import { materializeIdea } from '@/lib/services/materialization-service'
+import { getProjects } from '@/lib/services/projects-service'
 import type { ApiResponse } from '@/types/api'
 import type { Project } from '@/types/project'
 
@@ -18,6 +19,15 @@ export async function POST(request: NextRequest) {
       return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
     }
 
+    // Idempotency guard: if idea is already materialized, return existing project
+    if (idea.status === 'arena') {
+      const allProjects = await getProjects()
+      const existing = allProjects.find((p) => p.ideaId === ideaId)
+      if (existing) {
+        return NextResponse.json<ApiResponse<Project>>({ data: existing }, { status: 200 })
+      }
+    }
+
     const drill = getDrillSessionByIdeaId(ideaId)
     if (!drill) {
       return NextResponse.json<ApiResponse<never>>({ error: 'Drill session not found for this idea' }, { status: 400 })
diff --git a/app/arena/[projectId]/page.tsx b/app/arena/[projectId]/page.tsx
index 44540fb..78655b1 100644
--- a/app/arena/[projectId]/page.tsx
+++ b/app/arena/[projectId]/page.tsx
@@ -1,3 +1,5 @@
+export const dynamic = 'force-dynamic'
+
 import { notFound } from 'next/navigation'
 import { getProjectById } from '@/lib/services/projects-service'
 import { getTasksForProject } from '@/lib/services/tasks-service'
diff --git a/app/arena/page.tsx b/app/arena/page.tsx
index c29d08c..b631518 100644
--- a/app/arena/page.tsx
+++ b/app/arena/page.tsx
@@ -1,3 +1,5 @@
+export const dynamic = 'force-dynamic'
+
 import { getArenaProjects } from '@/lib/services/projects-service'
 import { AppShell } from '@/components/shell/app-shell'
 import { EmptyState } from '@/components/common/empty-state'
diff --git a/app/drill/page.tsx b/app/drill/page.tsx
index ae2d08b..95a7259 100644
--- a/app/drill/page.tsx
+++ b/app/drill/page.tsx
@@ -296,7 +296,7 @@ function DrillContent() {
           <div>
             <div className="mb-8">
               <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{"What's the call?"}</h2>
-              <p className="text-[#94a3b8]">Arena, Icebox, or Remove. No limbo.</p>
+              <p className="text-[#94a3b8]">Commit, hold, or remove. Every idea gets a clear decision.</p>
             </div>
             {errorMsg && (
               <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
@@ -310,14 +310,14 @@ function DrillContent() {
                 </div>
               )}
               <GiantChoiceButton
-                label="Commit to Arena"
+                label="Start building"
                 description="This gets built. Now."
                 onClick={() => handleDecision('arena')}
                 variant="success"
                 disabled={saving}
               />
               <GiantChoiceButton
-                label="Send to Icebox"
+                label="Put on hold"
                 description="Not now. Maybe later."
                 onClick={() => handleDecision('icebox')}
                 variant="ice"
diff --git a/app/drill/success/page.tsx b/app/drill/success/page.tsx
index df02e5c..27a4249 100644
--- a/app/drill/success/page.tsx
+++ b/app/drill/success/page.tsx
@@ -84,7 +84,7 @@ function DrillSuccessContent() {
                href={ROUTES.arenaProject(createdProject.id)}
                className="inline-flex items-center justify-center w-full px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25 group"
              >
-               Go to Arena
+               View project
                <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
           </div>
diff --git a/app/icebox/page.tsx b/app/icebox/page.tsx
index 6d55814..57feccd 100644
--- a/app/icebox/page.tsx
+++ b/app/icebox/page.tsx
@@ -1,3 +1,5 @@
+export const dynamic = 'force-dynamic'
+
 import { getIdeas } from '@/lib/services/ideas-service'
 import { getProjects } from '@/lib/services/projects-service'
 import { buildIceboxViewModel } from '@/lib/view-models/icebox-view-model'
diff --git a/app/inbox/page.tsx b/app/inbox/page.tsx
index 0c2a52e..c768584 100644
--- a/app/inbox/page.tsx
+++ b/app/inbox/page.tsx
@@ -1,3 +1,5 @@
+export const dynamic = 'force-dynamic'
+
 import { getInboxEvents } from '@/lib/services/inbox-service'
 import { buildInboxViewModel } from '@/lib/view-models/inbox-view-model'
 import { AppShell } from '@/components/shell/app-shell'
diff --git a/app/killed/page.tsx b/app/killed/page.tsx
index 8c06b84..37ab286 100644
--- a/app/killed/page.tsx
+++ b/app/killed/page.tsx
@@ -1,3 +1,5 @@
+export const dynamic = 'force-dynamic'
+
 import { getProjectsByState } from '@/lib/services/projects-service'
 import { AppShell } from '@/components/shell/app-shell'
 import { EmptyState } from '@/components/common/empty-state'
diff --git a/app/page.tsx b/app/page.tsx
index 42c2021..239a7b0 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -1,3 +1,5 @@
+export const dynamic = 'force-dynamic'
+
 import { getIdeasByStatus } from '@/lib/services/ideas-service'
 import { getArenaProjects } from '@/lib/services/projects-service'
 import { getInboxEvents } from '@/lib/services/inbox-service'
diff --git a/app/review/[prId]/page.tsx b/app/review/[prId]/page.tsx
index d5336a1..896a318 100644
--- a/app/review/[prId]/page.tsx
+++ b/app/review/[prId]/page.tsx
@@ -1,3 +1,5 @@
+export const dynamic = 'force-dynamic'
+
 import { notFound } from 'next/navigation'
 import { getPRById } from '@/lib/services/prs-service'
 import { getProjectById } from '@/lib/services/projects-service'
diff --git a/app/send/page.tsx b/app/send/page.tsx
index a367461..8b92b9f 100644
--- a/app/send/page.tsx
+++ b/app/send/page.tsx
@@ -1,3 +1,5 @@
+export const dynamic = 'force-dynamic'
+
 import { AppShell } from '@/components/shell/app-shell'
 import { getIdeasByStatus } from '@/lib/services/ideas-service'
 import { EmptyState } from '@/components/common/empty-state'
diff --git a/app/shipped/page.tsx b/app/shipped/page.tsx
index bcabb70..8984381 100644
--- a/app/shipped/page.tsx
+++ b/app/shipped/page.tsx
@@ -1,3 +1,5 @@
+export const dynamic = 'force-dynamic'
+
 import { getProjectsByState } from '@/lib/services/projects-service'
 import { AppShell } from '@/components/shell/app-shell'
 import { EmptyState } from '@/components/common/empty-state'
diff --git a/board.md b/board.md
index a06b9dd..4ea6e4f 100644
--- a/board.md
+++ b/board.md
@@ -4,7 +4,7 @@
 
 | Sprint | Focus | Tests | Status |
 |--------|-------|-------|--------|
-| (none) | — | — | — |
+| Sprint 1 | Make It Real (Local-First) | TSC ✅ Build ✅ | ✅ Complete |
 
 ---
 
@@ -51,16 +51,16 @@ Lane 6 (Visual QA + Polish): [W1] → [W2] → [W3] → [W4] → [W5] → [W6]
 | 🔵 Lane 3 | Send & Home Cockpit | `lanes/lane-3-send-home.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
 | 🟡 Lane 4 | Review & Merge Experience | `lanes/lane-4-review.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
 | 🟣 Lane 5 | Copy, Inbox & Dev Harness | `lanes/lane-5-copy-inbox-harness.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
-| 🏁 Lane 6 | Visual QA & Final Polish | `lanes/lane-6-visual-qa.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ W6 ⬜ |
+| 🏁 Lane 6 | Visual QA & Final Polish | `lanes/lane-6-visual-qa.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
 
 ---
 
 ## Pre-Flight Checklist
 
-- [ ] `npm install` succeeds
-- [ ] `npx tsc --noEmit` passes
-- [ ] `npm run build` passes
-- [ ] Dev server starts (`npm run dev`)
+- [x] `npm install` succeeds
+- [x] `npx tsc --noEmit` passes
+- [x] `npm run build` passes
+- [x] Dev server starts (`npm run dev`)
 
 ## Handoff Protocol
 
@@ -79,4 +79,4 @@ Lane 6 (Visual QA + Polish): [W1] → [W2] → [W3] → [W4] → [W5] → [W6]
 | Lane 3 | ✅ | ✅ | All Lane 3 files clean; `npx tsc --noEmit` passes (exit 0); `npm run build` passes (exit 0) |
 | Lane 4 | ✅ | ✅ | Preview-dominant review page, real iframe PreviewFrame, wired Merge + Approve buttons, FixRequestBox persists, plain-language pane labels, reviewState VM. |
 | Lane 5 | ✅ | ✅ | Fixed all Lane 5 files; global build now passing after Lane 1 fixes. |
-| Lane 6 | ⬜ | ⬜ | |
+| Lane 6 | ✅ | ✅ | Full E2E QA: dev harness → send → drill → materialize → review → inbox. All lore-heavy labels replaced. Idempotency guard added. force-dynamic on all mutable pages. |
diff --git a/components/archive/archive-filter-bar.tsx b/components/archive/archive-filter-bar.tsx
index 99f606f..bbfe1e9 100644
--- a/components/archive/archive-filter-bar.tsx
+++ b/components/archive/archive-filter-bar.tsx
@@ -8,8 +8,8 @@ interface ArchiveFilterBarProps {
 export function ArchiveFilterBar({ filter, onChange }: ArchiveFilterBarProps) {
   const options = [
     { value: 'all' as const, label: 'All' },
-    { value: 'shipped' as const, label: 'Trophy Room' },
-    { value: 'killed' as const, label: 'Graveyard' },
+    { value: 'shipped' as const, label: 'Shipped' },
+    { value: 'killed' as const, label: 'Removed' },
   ]
 
   return (
diff --git a/components/dev/gpt-idea-form.tsx b/components/dev/gpt-idea-form.tsx
index c0634b3..f363138 100644
--- a/components/dev/gpt-idea-form.tsx
+++ b/components/dev/gpt-idea-form.tsx
@@ -17,14 +17,14 @@ export function GPTIdeaForm() {
 
     const formData = new FormData(e.currentTarget)
     const payload = {
+      source: 'gpt',
       event: 'idea_captured',
       data: {
         title: formData.get('title'),
-        summary: formData.get('summary'),
-        body: formData.get('body'),
-        metadata: {
-          gpt_thread_id: `thread_${Math.random().toString(36).slice(2)}`,
-        },
+        rawPrompt: formData.get('rawPrompt'),
+        gptSummary: formData.get('gptSummary'),
+        vibe: formData.get('vibe') || undefined,
+        audience: formData.get('audience') || undefined,
       },
       timestamp: new Date().toISOString(),
     }
@@ -84,32 +84,57 @@ export function GPTIdeaForm() {
       </div>
 
       <div>
-        <label htmlFor="summary" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
+        <label htmlFor="gptSummary" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
           GPT Summary (One-liner)
         </label>
         <input
           required
-          id="summary"
-          name="summary"
+          id="gptSummary"
+          name="gptSummary"
           placeholder="A short, catchy summary of the idea."
           className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors"
         />
       </div>
 
       <div>
-        <label htmlFor="body" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
-          Full Context (Markdown)
+        <label htmlFor="rawPrompt" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
+          Raw Prompt / Full Context
         </label>
         <textarea
           required
-          id="body"
-          name="body"
-          rows={10}
-          placeholder="Paste the full GPT context here..."
+          id="rawPrompt"
+          name="rawPrompt"
+          rows={6}
+          placeholder="Paste the full GPT conversation or raw prompt here..."
           className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors font-mono text-sm"
         />
       </div>
 
+      <div className="grid grid-cols-2 gap-4">
+        <div>
+          <label htmlFor="vibe" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
+            Vibe (optional)
+          </label>
+          <input
+            id="vibe"
+            name="vibe"
+            placeholder="e.g., productivity"
+            className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
+          />
+        </div>
+        <div>
+          <label htmlFor="audience" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
+            Audience (optional)
+          </label>
+          <input
+            id="audience"
+            name="audience"
+            placeholder="e.g., indie hackers"
+            className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
+          />
+        </div>
+      </div>
+
       <button
         disabled={loading}
         type="submit"
diff --git a/components/icebox/stale-idea-modal.tsx b/components/icebox/stale-idea-modal.tsx
index d68db8b..f5c14ac 100644
--- a/components/icebox/stale-idea-modal.tsx
+++ b/components/icebox/stale-idea-modal.tsx
@@ -26,26 +26,26 @@ export function StaleIdeaModal({
         <div className="text-2xl mb-3">❄</div>
         <h3 className="text-lg font-semibold text-[#e2e8f0] mb-1">{title}</h3>
         <p className="text-sm text-amber-400 mb-4">
-          This has been frozen for {daysInIcebox} days. Time to decide.
+          This has been on hold for {daysInIcebox} days. Time to decide.
         </p>
         <div className="flex flex-col gap-2">
           <button
             onClick={onPromote}
             className="px-4 py-2.5 text-sm font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
           >
-            Promote to Arena
+            Start building
           </button>
           <button
             onClick={onDiscard}
             className="px-4 py-2.5 text-sm text-red-400/80 border border-[#1e1e2e] rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors"
           >
-            Remove from Icebox
+            Remove this idea
           </button>
           <button
             onClick={onClose}
             className="px-4 py-2 text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
           >
-            Keep frozen
+            Keep on hold
           </button>
         </div>
       </div>
diff --git a/components/shell/command-bar.tsx b/components/shell/command-bar.tsx
index 296f408..e2180b4 100644
--- a/components/shell/command-bar.tsx
+++ b/components/shell/command-bar.tsx
@@ -6,9 +6,9 @@ import { ROUTES } from '@/lib/routes'
 
 const COMMANDS = [
   { label: 'Go to In Progress', href: ROUTES.arena },
-  { label: 'Go to Icebox', href: ROUTES.icebox },
+  { label: 'Go to On Hold', href: ROUTES.icebox },
   { label: 'Go to Inbox', href: ROUTES.inbox },
-  { label: 'Go to Trophy Room', href: ROUTES.shipped },
+  { label: 'Go to Shipped', href: ROUTES.shipped },
   { label: 'New Idea', href: ROUTES.send },
 ]
 
diff --git a/components/shell/studio-header.tsx b/components/shell/studio-header.tsx
index 253acac..e020e57 100644
--- a/components/shell/studio-header.tsx
+++ b/components/shell/studio-header.tsx
@@ -9,9 +9,9 @@ const PAGE_TITLES: Record<string, string> = {
   '/send': 'Incoming Idea',
   '/drill': 'Drill',
   '/arena': 'In Progress',
-  '/icebox': 'Icebox',
-  '/shipped': 'Trophy Room',
-  '/killed': 'Graveyard',
+  '/icebox': 'On Hold',
+  '/shipped': 'Shipped',
+  '/killed': 'Removed',
   '/inbox': 'Inbox',
 }
 
diff --git a/gitrdiff.md b/gitrdiff.md
index 9275954..3735963 100644
--- a/gitrdiff.md
+++ b/gitrdiff.md
@@ -1,6 +1,6 @@
 # Git Diff Report
 
-**Generated**: Sun, Mar 22, 2026 12:57:14 AM
+**Generated**: Sun, Mar 22, 2026  1:27:35 AM
 
 **Local Branch**: main
 
@@ -13,5567 +13,36 @@
 ### Modified/Staged Files
 
 ```
- M .gitignore
- M README.md
  M app/api/actions/kill-idea/route.ts
  M app/api/actions/mark-shipped/route.ts
- M app/api/actions/merge-pr/route.ts
  M app/api/actions/move-to-icebox/route.ts
  M app/api/actions/promote-to-arena/route.ts
- M app/api/drill/route.ts
  M app/api/ideas/materialize/route.ts
- M app/api/ideas/route.ts
- M app/api/inbox/route.ts
- M app/api/projects/route.ts
- M app/api/prs/route.ts
- M app/api/webhook/gpt/route.ts
  M app/arena/[projectId]/page.tsx
  M app/arena/page.tsx
- M app/drill/end/page.tsx
  M app/drill/page.tsx
  M app/drill/success/page.tsx
- M app/globals.css
  M app/icebox/page.tsx
+ M app/inbox/page.tsx
  M app/killed/page.tsx
- M app/layout.tsx
  M app/page.tsx
  M app/review/[prId]/page.tsx
  M app/send/page.tsx
  M app/shipped/page.tsx
- M components/archive/graveyard-card.tsx
- M components/archive/trophy-card.tsx
- M components/arena/preview-frame.tsx
- M components/arena/project-anchor-pane.tsx
- M components/arena/project-engine-pane.tsx
- M components/arena/project-reality-pane.tsx
- M components/drill/giant-choice-button.tsx
- M components/icebox/icebox-card.tsx
- M components/inbox/inbox-event-card.tsx
- M components/inbox/inbox-filter-tabs.tsx
- M components/review/fix-request-box.tsx
- M components/review/split-review-layout.tsx
- M components/send/captured-idea-card.tsx
- M components/send/idea-summary-panel.tsx
- M components/shell/mobile-nav.tsx
- M components/shell/studio-sidebar.tsx
- M content/drill-principles.md
- M content/no-limbo.md
- M content/onboarding.md
- M content/tone-guide.md
- M lib/adapters/github-adapter.ts
- M lib/adapters/notifications-adapter.ts
- M lib/adapters/vercel-adapter.ts
- M lib/constants.ts
+ M board.md
+ M components/archive/archive-filter-bar.tsx
+ M components/dev/gpt-idea-form.tsx
+ M components/icebox/stale-idea-modal.tsx
+ M components/shell/command-bar.tsx
+ M components/shell/studio-header.tsx
+ M gitrdiff.md
+ M lanes/lane-6-visual-qa.md
  M lib/formatters/inbox-formatters.ts
- D lib/mock-data.ts
- M lib/routes.ts
- M lib/services/drill-service.ts
- M lib/services/ideas-service.ts
- M lib/services/inbox-service.ts
  M lib/services/materialization-service.ts
- M lib/services/projects-service.ts
- M lib/services/prs-service.ts
- M lib/services/tasks-service.ts
- M lib/studio-copy.ts
- M lib/validators/drill-validator.ts
- M lib/view-models/review-view-model.ts
- M package-lock.json
- M package.json
- M types/drill.ts
+ M lib/storage.ts
  M types/inbox.ts
- M types/pr.ts
-?? agents.md
-?? app/dev/
-?? board.md
-?? components/common/next-action-badge.tsx
-?? components/dev/
-?? components/drill/idea-context-card.tsx
-?? components/review/merge-actions.tsx
-?? components/send/send-page-client.tsx
-?? dump00.md
-?? gitrdiff.md
-?? lanes/
-?? lib/seed-data.ts
-?? lib/storage.ts
 ```
 
 ### Uncommitted Diff
 
 ```diff
-diff --git a/.gitignore b/.gitignore
-index 9347eb1..e23afc9 100644
---- a/.gitignore
-+++ b/.gitignore
-@@ -17,6 +17,5 @@ yarn-error.log*
- *.tsbuildinfo
- next-env.d.ts
- 
--# initrep artefacts
--gitrdiff.md
--dump*.md
-+# Local Data
-+.local-data/
-diff --git a/README.md b/README.md
-index 21b3c26..137ff2c 100644
---- a/README.md
-+++ b/README.md
-@@ -1,29 +1,29 @@
- # Mira Studio
- 
--> Chat is where ideas are born. Studio is where ideas are forced into truth.
-+> Your ideas, shaped and shipped.
- 
--Mira is a Vercel-hosted Studio UI for managing ideas from conception through execution. It connects to a custom GPT that sends structured idea payloads via webhook, then provides a focused flow for defining, prioritizing, and executing those ideas.
-+Mira is a Vercel-hosted Studio UI for managing ideas from capture through execution. It connects to a custom GPT that sends structured idea payloads via webhook, then provides a focused flow for defining, prioritizing, and executing those ideas.
- 
--## The Five Zones
-+## The Journey
- 
- | Zone | Route | Description |
- |------|-------|-------------|
--| **Send** | `/send` | Incoming ideas from GPT |
--| **Drill** | `/drill` | 6-step idea definition flow |
--| **Arena** | `/arena` | Active projects (max 3) |
--| **Icebox** | `/icebox` | Deferred ideas and projects |
--| **Archive** | `/shipped` `/killed` | Trophy Room + Graveyard |
-+| **Captured** | `/send` | Incoming ideas from GPT |
-+| **Defined** | `/drill` | 6-step idea definition flow |
-+| **In Progress**| `/arena` | Active projects (max 3) |
-+| **On Hold** | `/icebox` | Deferred ideas and projects |
-+| **Archive** | `/shipped` `/killed` | Shipped + Removed |
- 
- ## The Rule
- 
--No limbo. Every idea is either **in play**, **frozen**, or **gone**.
-+Every idea gets a clear decision. No limbo.
- 
- ## Tech Stack
- 
--- **Next.js 14+** with App Router
-+- **Next.js 14.2** with App Router
- - **TypeScript** — strict mode
--- **Tailwind CSS** — dark studio theme
--- **Mock data** — no database required initially
-+- **Tailwind CSS 3.4** — dark studio theme
-+- **JSON File Storage** — local persistence under `.local-data/`
- 
- ## Getting Started
- 
-@@ -34,15 +34,28 @@ npm run dev
- 
- Open [http://localhost:3000](http://localhost:3000).
- 
-+## Local Development & Testing
-+
-+### Simulating GPT Ideas
-+Since Mira is designed to receive ideas from a custom GPT, you can simulate this locally using the **Dev Harness**:
-+Go to [`/dev/gpt-send`](http://localhost:3000/dev/gpt-send) to fill out a form that POSTs to the same `/api/webhook/gpt` endpoint used in production.
-+
-+### Data Persistence
-+Mira uses a local JSON file for data persistence during development.
-+- Data location: `.local-data/studio.json`
-+- This file is gitignored and survives server restarts.
-+- To reset your data, simply delete this file; it will auto-seed from `lib/seed-data.ts` on the next request.
-+
- ## Project Structure
- 
- ```
- app/           # Next.js App Router pages and API routes
- components/    # UI components (shell, common, zone-specific)
--lib/           # Services, adapters, formatters, validators
-+lib/           # Services, storage, state machine, copy, validators
- types/         # TypeScript type definitions
- content/       # Product copy and principles
- docs/          # Architecture and planning docs
-+.local-data/   # Local JSON persistence (gitignored)
- ```
- 
- ## API Routes
-@@ -55,15 +68,13 @@ docs/          # Architecture and planning docs
- | `/api/projects` | GET | Projects list |
- | `/api/tasks` | GET | Tasks by project |
- | `/api/prs` | GET | PRs by project |
--| `/api/inbox` | GET | Inbox events |
--| `/api/actions/promote-to-arena` | POST | Move project to arena |
--| `/api/actions/move-to-icebox` | POST | Move project to icebox |
-+| `/api/inbox` | GET, PATCH | Inbox events & mark-read |
-+| `/api/actions/promote-to-arena` | POST | Move project to in-progress |
-+| `/api/actions/move-to-icebox` | POST | Move project to on-hold |
- | `/api/actions/mark-shipped` | POST | Mark project shipped |
- | `/api/actions/kill-idea` | POST | Mark idea removed |
- | `/api/actions/merge-pr` | POST | Merge a PR |
- | `/api/webhook/gpt` | POST | GPT webhook receiver |
--| `/api/webhook/github` | POST | GitHub webhook receiver |
--| `/api/webhook/vercel` | POST | Vercel webhook receiver |
- 
- ## Environment Variables
- 
-diff --git a/app/api/actions/kill-idea/route.ts b/app/api/actions/kill-idea/route.ts
-index 114c5b2..cc5b2ab 100644
---- a/app/api/actions/kill-idea/route.ts
-+++ b/app/api/actions/kill-idea/route.ts
-@@ -1,5 +1,6 @@
- import { NextRequest, NextResponse } from 'next/server'
- import { updateIdeaStatus } from '@/lib/services/ideas-service'
-+import { createInboxEvent } from '@/lib/services/inbox-service'
- import type { ApiResponse } from '@/types/api'
- import type { Idea } from '@/types/idea'
- 
-@@ -11,10 +12,19 @@ export async function POST(request: NextRequest) {
-     return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
-   }
- 
--  const idea = updateIdeaStatus(ideaId, 'killed')
-+  const idea = await updateIdeaStatus(ideaId, 'killed')
-   if (!idea) {
-     return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
-   }
- 
-+  createInboxEvent({
-+    type: 'project_killed',
-+    title: `Idea removed: ${idea.title}`,
-+    body: 'Idea was removed from the captured list.',
-+    timestamp: new Date().toISOString(),
-+    severity: 'info',
-+    read: false,
-+  })
-+
-   return NextResponse.json<ApiResponse<Idea>>({ data: idea })
- }
-diff --git a/app/api/actions/mark-shipped/route.ts b/app/api/actions/mark-shipped/route.ts
-index fa5567d..80ad1ae 100644
---- a/app/api/actions/mark-shipped/route.ts
-+++ b/app/api/actions/mark-shipped/route.ts
-@@ -1,5 +1,6 @@
- import { NextRequest, NextResponse } from 'next/server'
- import { updateProjectState } from '@/lib/services/projects-service'
-+import { createInboxEvent } from '@/lib/services/inbox-service'
- import type { ApiResponse } from '@/types/api'
- import type { Project } from '@/types/project'
- 
-@@ -11,12 +12,22 @@ export async function POST(request: NextRequest) {
-     return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
-   }
- 
--  const project = updateProjectState(projectId, 'shipped', {
-+  const project = await updateProjectState(projectId, 'shipped', {
-     shippedAt: new Date().toISOString(),
-   })
-   if (!project) {
-     return NextResponse.json<ApiResponse<never>>({ error: 'Project not found' }, { status: 404 })
-   }
- 
-+  createInboxEvent({
-+    type: 'project_shipped',
-+    title: `Project shipped: ${project.name}`,
-+    body: 'Project has been marked as shipped. Great work!',
-+    timestamp: new Date().toISOString(),
-+    severity: 'success',
-+    projectId: project.id,
-+    read: false,
-+  })
-+
-   return NextResponse.json<ApiResponse<Project>>({ data: project })
- }
-diff --git a/app/api/actions/merge-pr/route.ts b/app/api/actions/merge-pr/route.ts
-index 6639ad6..7594446 100644
---- a/app/api/actions/merge-pr/route.ts
-+++ b/app/api/actions/merge-pr/route.ts
-@@ -1,6 +1,9 @@
- import { NextRequest, NextResponse } from 'next/server'
--import { mergePR } from '@/lib/adapters/github-adapter'
-+import { updatePR, getPRById } from '@/lib/services/prs-service'
-+import { createInboxEvent } from '@/lib/services/inbox-service'
- import type { ApiResponse } from '@/types/api'
-+import type { PullRequest } from '@/types/pr'
-+import { ROUTES } from '@/lib/routes'
- 
- export async function POST(request: NextRequest) {
-   const body = await request.json()
-@@ -10,10 +13,24 @@ export async function POST(request: NextRequest) {
-     return NextResponse.json<ApiResponse<never>>({ error: 'prId is required' }, { status: 400 })
-   }
- 
--  const success = await mergePR(prId)
--  if (!success) {
-+  const pr = await getPRById(prId)
-+  if (!pr) {
-+    return NextResponse.json<ApiResponse<never>>({ error: 'PR not found' }, { status: 404 })
-+  }
-+
-+  const updated = await updatePR(prId, { status: 'merged', reviewStatus: 'merged' })
-+  if (!updated) {
-     return NextResponse.json<ApiResponse<never>>({ error: 'Merge failed' }, { status: 500 })
-   }
- 
--  return NextResponse.json<ApiResponse<{ merged: boolean }>>({ data: { merged: true } })
-+  await createInboxEvent({
-+    projectId: pr.projectId,
-+    type: 'merge_completed',
-+    title: `PR merged: ${pr.title}`,
-+    body: `PR #${pr.number} has been merged.`,
-+    severity: 'success',
-+    actionUrl: ROUTES.arenaProject(pr.projectId),
-+  })
-+
-+  return NextResponse.json<ApiResponse<PullRequest>>({ data: updated })
- }
-diff --git a/app/api/actions/move-to-icebox/route.ts b/app/api/actions/move-to-icebox/route.ts
-index 2e11050..b10f399 100644
---- a/app/api/actions/move-to-icebox/route.ts
-+++ b/app/api/actions/move-to-icebox/route.ts
-@@ -1,20 +1,30 @@
- import { NextRequest, NextResponse } from 'next/server'
--import { updateProjectState } from '@/lib/services/projects-service'
-+import { updateIdeaStatus } from '@/lib/services/ideas-service'
-+import { createInboxEvent } from '@/lib/services/inbox-service'
- import type { ApiResponse } from '@/types/api'
--import type { Project } from '@/types/project'
-+import type { Idea } from '@/types/idea'
- 
- export async function POST(request: NextRequest) {
-   const body = await request.json()
--  const { projectId } = body
-+  const { ideaId } = body
- 
--  if (!projectId) {
--    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
-+  if (!ideaId) {
-+    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
-   }
- 
--  const project = updateProjectState(projectId, 'icebox')
--  if (!project) {
--    return NextResponse.json<ApiResponse<never>>({ error: 'Project not found' }, { status: 404 })
-+  const idea = await updateIdeaStatus(ideaId, 'icebox')
-+  if (!idea) {
-+    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
-   }
- 
--  return NextResponse.json<ApiResponse<Project>>({ data: project })
-+  await createInboxEvent({
-+    type: 'idea_captured',
-+    title: `Idea put on hold: ${idea.title}`,
-+    body: 'Idea was moved to the Icebox.',
-+    timestamp: new Date().toISOString(),
-+    severity: 'info',
-+    read: false,
-+  })
-+
-+  return NextResponse.json<ApiResponse<Idea>>({ data: idea })
- }
-diff --git a/app/api/actions/promote-to-arena/route.ts b/app/api/actions/promote-to-arena/route.ts
-index dea6d49..44efa8c 100644
---- a/app/api/actions/promote-to-arena/route.ts
-+++ b/app/api/actions/promote-to-arena/route.ts
-@@ -1,27 +1,38 @@
- import { NextRequest, NextResponse } from 'next/server'
--import { updateProjectState, isArenaAtCapacity } from '@/lib/services/projects-service'
-+import { updateIdeaStatus } from '@/lib/services/ideas-service'
-+import { isArenaAtCapacity } from '@/lib/services/projects-service'
-+import { createInboxEvent } from '@/lib/services/inbox-service'
- import type { ApiResponse } from '@/types/api'
--import type { Project } from '@/types/project'
-+import type { Idea } from '@/types/idea'
- 
- export async function POST(request: NextRequest) {
-   const body = await request.json()
--  const { projectId } = body
-+  const { ideaId } = body
- 
--  if (!projectId) {
--    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
-+  if (!ideaId) {
-+    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
-   }
- 
--  if (isArenaAtCapacity()) {
-+  if (await isArenaAtCapacity()) {
-     return NextResponse.json<ApiResponse<never>>(
-       { error: 'Arena is at capacity. Ship or remove a project first.' },
-       { status: 409 }
-     )
-   }
- 
--  const project = updateProjectState(projectId, 'arena')
--  if (!project) {
--    return NextResponse.json<ApiResponse<never>>({ error: 'Project not found' }, { status: 404 })
-+  const idea = await updateIdeaStatus(ideaId, 'arena')
-+  if (!idea) {
-+    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
-   }
- 
--  return NextResponse.json<ApiResponse<Project>>({ data: project })
-+  await createInboxEvent({
-+    type: 'project_promoted',
-+    title: `Idea promoted to Arena: ${idea.title}`,
-+    body: 'Idea status changed to arena — ready to build.',
-+    timestamp: new Date().toISOString(),
-+    severity: 'success',
-+    read: false,
-+  })
-+
-+  return NextResponse.json<ApiResponse<Idea>>({ data: idea })
- }
-diff --git a/app/api/drill/route.ts b/app/api/drill/route.ts
-index b0a9419..8538904 100644
---- a/app/api/drill/route.ts
-+++ b/app/api/drill/route.ts
-@@ -5,16 +5,23 @@ import type { ApiResponse } from '@/types/api'
- import type { DrillSession } from '@/types/drill'
- 
- export async function POST(request: NextRequest) {
--  const body = await request.json()
--  const validation = validateDrillPayload(body)
-+  try {
-+    const body = await request.json()
-+    const validation = validateDrillPayload(body)
- 
--  if (!validation.valid) {
-+    if (!validation.valid) {
-+      return NextResponse.json<ApiResponse<never>>(
-+        { error: validation.errors?.join(', ') || 'Invalid payload' },
-+        { status: 400 }
-+      )
-+    }
-+
-+    const session = saveDrillSession(body)
-+    return NextResponse.json<ApiResponse<DrillSession>>({ data: session }, { status: 201 })
-+  } catch (err: any) {
-     return NextResponse.json<ApiResponse<never>>(
--      { error: validation.error },
--      { status: 400 }
-+      { error: err.message || 'Error processing request' },
-+      { status: 500 }
-     )
-   }
--
--  const session = saveDrillSession(body)
--  return NextResponse.json<ApiResponse<DrillSession>>({ data: session }, { status: 201 })
- }
-diff --git a/app/api/ideas/materialize/route.ts b/app/api/ideas/materialize/route.ts
-index d3403eb..0816988 100644
---- a/app/api/ideas/materialize/route.ts
-+++ b/app/api/ideas/materialize/route.ts
-@@ -1,25 +1,32 @@
- import { NextRequest, NextResponse } from 'next/server'
- import { getIdeaById } from '@/lib/services/ideas-service'
--import { saveDrillSession } from '@/lib/services/drill-service'
-+import { getDrillSessionByIdeaId } from '@/lib/services/drill-service'
- import { materializeIdea } from '@/lib/services/materialization-service'
- import type { ApiResponse } from '@/types/api'
- import type { Project } from '@/types/project'
- 
- export async function POST(request: NextRequest) {
--  const body = await request.json()
--  const { ideaId, drillSession } = body
-+  try {
-+    const { ideaId } = await request.json()
- 
--  if (!ideaId) {
--    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
--  }
-+    if (!ideaId) {
-+      return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
-+    }
- 
--  const idea = getIdeaById(ideaId)
--  if (!idea) {
--    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
--  }
-+    const idea = await getIdeaById(ideaId)
-+    if (!idea) {
-+      return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
-+    }
- 
--  const drill = saveDrillSession({ ...drillSession, ideaId })
--  const project = await materializeIdea(idea, drill)
-+    const drill = getDrillSessionByIdeaId(ideaId)
-+    if (!drill) {
-+      return NextResponse.json<ApiResponse<never>>({ error: 'Drill session not found for this idea' }, { status: 400 })
-+    }
- 
--  return NextResponse.json<ApiResponse<Project>>({ data: project }, { status: 201 })
-+    const project = await materializeIdea(idea, drill)
-+
-+    return NextResponse.json<ApiResponse<Project>>({ data: project }, { status: 201 })
-+  } catch (err: any) {
-+    return NextResponse.json<ApiResponse<never>>({ error: err.message || 'Error processing request' }, { status: 500 })
-+  }
- }
-diff --git a/app/api/ideas/route.ts b/app/api/ideas/route.ts
-index 88de5ff..b8138a8 100644
---- a/app/api/ideas/route.ts
-+++ b/app/api/ideas/route.ts
-@@ -6,9 +6,9 @@ import type { Idea } from '@/types/idea'
- 
- export async function GET(request: NextRequest) {
-   const { searchParams } = new URL(request.url)
--  const status = searchParams.get('status')
-+  const status = searchParams.get('status') as any
- 
--  const ideas = getIdeas()
-+  const ideas = await getIdeas()
-   const filtered = status ? ideas.filter((i) => i.status === status) : ideas
- 
-   return NextResponse.json<ApiResponse<Idea[]>>({ data: filtered })
-@@ -25,6 +25,6 @@ export async function POST(request: NextRequest) {
-     )
-   }
- 
--  const idea = createIdea(body)
-+  const idea = await createIdea(body)
-   return NextResponse.json<ApiResponse<Idea>>({ data: idea }, { status: 201 })
- }
-diff --git a/app/api/inbox/route.ts b/app/api/inbox/route.ts
-index 8e33b52..fc785d8 100644
---- a/app/api/inbox/route.ts
-+++ b/app/api/inbox/route.ts
-@@ -1,5 +1,5 @@
- import { NextResponse } from 'next/server'
--import { getInboxEvents } from '@/lib/services/inbox-service'
-+import { getInboxEvents, markRead } from '@/lib/services/inbox-service'
- import type { ApiResponse } from '@/types/api'
- import type { InboxEvent } from '@/types/inbox'
- 
-@@ -7,3 +7,13 @@ export async function GET() {
-   const events = await getInboxEvents()
-   return NextResponse.json<ApiResponse<InboxEvent[]>>({ data: events })
- }
-+
-+export async function PATCH(request: Request) {
-+  const { id } = await request.json()
-+  if (!id) {
-+    return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })
-+  }
-+
-+  await markRead(id)
-+  return NextResponse.json({ success: true })
-+}
-diff --git a/app/api/projects/route.ts b/app/api/projects/route.ts
-index 3664291..0498232 100644
---- a/app/api/projects/route.ts
-+++ b/app/api/projects/route.ts
-@@ -7,7 +7,7 @@ export async function GET(request: NextRequest) {
-   const { searchParams } = new URL(request.url)
-   const state = searchParams.get('state') as ProjectState | null
- 
--  const projects = state ? getProjectsByState(state) : getProjects()
-+  const projects = state ? await getProjectsByState(state) : await getProjects()
- 
-   return NextResponse.json<ApiResponse<Project[]>>({ data: projects })
- }
-diff --git a/app/api/prs/route.ts b/app/api/prs/route.ts
-index 7e74fa2..e6935a7 100644
---- a/app/api/prs/route.ts
-+++ b/app/api/prs/route.ts
-@@ -1,7 +1,9 @@
- import { NextRequest, NextResponse } from 'next/server'
--import { getPRsForProject } from '@/lib/services/prs-service'
-+import { getPRsForProject, updatePR, getPRById } from '@/lib/services/prs-service'
-+import { createInboxEvent } from '@/lib/services/inbox-service'
- import type { ApiResponse } from '@/types/api'
- import type { PullRequest } from '@/types/pr'
-+import { ROUTES } from '@/lib/routes'
- 
- export async function GET(request: NextRequest) {
-   const { searchParams } = new URL(request.url)
-@@ -14,3 +16,40 @@ export async function GET(request: NextRequest) {
-   const prs = await getPRsForProject(projectId)
-   return NextResponse.json<ApiResponse<PullRequest[]>>({ data: prs })
- }
-+
-+export async function PATCH(request: NextRequest) {
-+  const body = await request.json()
-+  const { prId, requestedChanges, reviewStatus } = body
-+
-+  if (!prId) {
-+    return NextResponse.json<ApiResponse<never>>({ error: 'prId is required' }, { status: 400 })
-+  }
-+
-+  const pr = await getPRById(prId)
-+  if (!pr) {
-+    return NextResponse.json<ApiResponse<never>>({ error: 'PR not found' }, { status: 404 })
-+  }
-+
-+  const updates: Partial<PullRequest> = {}
-+  if (requestedChanges !== undefined) updates.requestedChanges = requestedChanges
-+  if (reviewStatus !== undefined) updates.reviewStatus = reviewStatus
-+
-+  const updated = await updatePR(prId, updates)
-+  if (!updated) {
-+    return NextResponse.json<ApiResponse<never>>({ error: 'Update failed' }, { status: 500 })
-+  }
-+
-+  // Create inbox event for changes_requested
-+  if (reviewStatus === 'changes_requested' && requestedChanges) {
-+    await createInboxEvent({
-+      projectId: pr.projectId,
-+      type: 'changes_requested',
-+      title: `Changes requested on PR #${pr.number}`,
-+      body: requestedChanges,
-+      severity: 'warning',
-+      actionUrl: ROUTES.review(pr.id),
-+    })
-+  }
-+
-+  return NextResponse.json<ApiResponse<PullRequest>>({ data: updated })
-+}
-diff --git a/app/api/webhook/gpt/route.ts b/app/api/webhook/gpt/route.ts
-index 473c535..f64022e 100644
---- a/app/api/webhook/gpt/route.ts
-+++ b/app/api/webhook/gpt/route.ts
-@@ -1,6 +1,7 @@
- import { NextRequest, NextResponse } from 'next/server'
- import { validateWebhookPayload } from '@/lib/validators/webhook-validator'
- import { createIdea } from '@/lib/services/ideas-service'
-+import { createInboxEvent } from '@/lib/services/inbox-service'
- import { parseGPTPayload } from '@/lib/adapters/gpt-adapter'
- import type { ApiResponse } from '@/types/api'
- 
-@@ -14,7 +15,18 @@ export async function POST(request: NextRequest) {
- 
-   if (body.event === 'idea_captured' && body.data) {
-     const parsed = parseGPTPayload(body.data as Parameters<typeof parseGPTPayload>[0])
--    const idea = createIdea(parsed)
-+    const idea = await createIdea(parsed)
-+    
-+    // Notify the user via inbox
-+    await createInboxEvent({
-+      type: 'idea_captured',
-+      title: 'New idea arrived from GPT',
-+      body: `"${idea.title}" has been captured and is ready for definition.`,
-+      timestamp: new Date().toISOString(),
-+      severity: 'info',
-+      read: false,
-+    })
-+
-     return NextResponse.json<ApiResponse<unknown>>({ data: idea, message: 'Idea captured' }, { status: 201 })
-   }
- 
-diff --git a/app/arena/[projectId]/page.tsx b/app/arena/[projectId]/page.tsx
-index d3908d0..44540fb 100644
---- a/app/arena/[projectId]/page.tsx
-+++ b/app/arena/[projectId]/page.tsx
-@@ -16,7 +16,7 @@ interface Props {
- }
- 
- export default async function ArenaProjectPage({ params }: Props) {
--  const project = getProjectById(params.projectId)
-+  const project = await getProjectById(params.projectId)
-   if (!project) notFound()
- 
-   const tasks = await getTasksForProject(project.id)
-diff --git a/app/arena/page.tsx b/app/arena/page.tsx
-index 52d4ef9..c29d08c 100644
---- a/app/arena/page.tsx
-+++ b/app/arena/page.tsx
-@@ -6,8 +6,8 @@ import { ActiveLimitBanner } from '@/components/arena/active-limit-banner'
- import Link from 'next/link'
- import { ROUTES } from '@/lib/routes'
- 
--export default function ArenaPage() {
--  const projects = getArenaProjects()
-+export default async function ArenaPage() {
-+  const projects = await getArenaProjects()
- 
-   return (
-     <AppShell>
-diff --git a/app/drill/end/page.tsx b/app/drill/end/page.tsx
-index 9d6f731..e9d64c5 100644
---- a/app/drill/end/page.tsx
-+++ b/app/drill/end/page.tsx
-@@ -3,26 +3,34 @@ import { ROUTES } from '@/lib/routes'
- 
- export default function DrillEndPage() {
-   return (
--    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
--      <div className="max-w-sm w-full text-center">
--        <div className="text-5xl mb-6 opacity-40">†</div>
--        <h1 className="text-2xl font-bold text-[#e2e8f0] mb-2">This idea is done.</h1>
--        <p className="text-[#94a3b8] text-sm mb-8">
--          Good ideas die too. That&apos;s how focus works. It&apos;s been preserved in the Graveyard.
-+    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6 text-center">
-+      <div className="max-w-md w-full">
-+        <div className="mb-8 p-12 bg-red-500/5 rounded-full inline-block border border-red-500/10">
-+          <div className="text-5xl opacity-40 grayscale translate-y-[-2px]">†</div>
-+        </div>
-+        <h1 className="text-3xl font-bold text-[#e2e8f0] mb-3">Idea Removed.</h1>
-+        <p className="text-[#94a3b8] text-lg mb-10 leading-relaxed">
-+          The best way to ship great work is to kill almost everything else. 
-+          This idea has been moved to the Graveyard to keep your focus sharp.
-         </p>
--        <div className="flex flex-col gap-3">
-+        <div className="flex flex-col gap-4">
-           <Link
--            href={ROUTES.killed}
--            className="px-6 py-3 bg-[#12121a] border border-[#1e1e2e] rounded-xl text-sm text-[#94a3b8] hover:text-[#e2e8f0] hover:border-[#2a2a3a] transition-colors"
-+            href={ROUTES.send}
-+            className="px-6 py-4 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-2xl text-sm font-semibold hover:bg-indigo-500/20 transition-all active:scale-95"
-           >
--            View Graveyard
-+            See other ideas
-           </Link>
-           <Link
-             href={ROUTES.home}
--            className="px-6 py-3 bg-indigo-500/20 text-indigo-400 rounded-xl text-sm font-medium hover:bg-indigo-500/30 transition-colors"
-+            className="px-6 py-4 bg-[#12121a] text-[#94a3b8] hover:text-[#e2e8f0] border border-[#1e1e2e] hover:border-[#2a2a3a] rounded-2xl text-sm font-medium transition-all"
-           >
--            Back to Studio
-+            Back to Home
-           </Link>
-+          <div className="pt-4">
-+            <Link href={ROUTES.killed} className="text-xs text-[#4b5563] hover:text-[#94a3b8] transition-colors">
-+              Visit the Graveyard
-+            </Link>
-+          </div>
-         </div>
-       </div>
-     </div>
-diff --git a/app/drill/page.tsx b/app/drill/page.tsx
-index 723410f..ae2d08b 100644
---- a/app/drill/page.tsx
-+++ b/app/drill/page.tsx
-@@ -6,6 +6,8 @@ import { DrillLayout } from '@/components/drill/drill-layout'
- import { DrillProgress } from '@/components/drill/drill-progress'
- import { GiantChoiceButton } from '@/components/drill/giant-choice-button'
- import { ROUTES } from '@/lib/routes'
-+import { IdeaContextCard } from '@/components/drill/idea-context-card'
-+import type { Idea } from '@/types/idea'
- 
- type Scope = 'small' | 'medium' | 'large'
- type ExecutionPath = 'solo' | 'assisted' | 'delegated'
-@@ -43,6 +45,10 @@ function DrillContent() {
-   const ideaId = searchParams.get('ideaId') ?? ''
- 
-   const [currentStep, setCurrentStep] = useState(0)
-+  const [saving, setSaving] = useState(false)
-+  const [errorMsg, setErrorMsg] = useState<string | null>(null)
-+  const [idea, setIdea] = useState<Idea | null>(null)
-+  const [fetchingIdea, setFetchingIdea] = useState(true)
-   const [state, setState] = useState<DrillState>({
-     intent: '',
-     successMetric: '',
-@@ -52,6 +58,29 @@ function DrillContent() {
-     decision: null,
-   })
- 
-+  useEffect(() => {
-+    if (!ideaId) {
-+      setFetchingIdea(false)
-+      return
-+    }
-+
-+    async function fetchIdea() {
-+      try {
-+        const res = await fetch('/api/ideas')
-+        if (!res.ok) throw new Error('Failed to fetch ideas')
-+        const data = await res.json()
-+        const found = (data.data as Idea[]).find((i) => i.id === ideaId)
-+        if (found) setIdea(found)
-+      } catch (err) {
-+        console.error('Error fetching idea for drill context:', err)
-+      } finally {
-+        setFetchingIdea(false)
-+      }
-+    }
-+
-+    fetchIdea()
-+  }, [ideaId])
-+
-   const step = STEPS[currentStep]
-   const totalSteps = STEPS.length
- 
-@@ -69,11 +98,13 @@ function DrillContent() {
- 
-   useEffect(() => {
-     function onKey(e: KeyboardEvent) {
--      if (e.key === 'Enter' && canAdvance()) advance()
-+      if (e.key === 'Enter' && step !== 'decision' && canAdvance() && !saving) {
-+        advance()
-+      }
-     }
-     window.addEventListener('keydown', onKey)
-     return () => window.removeEventListener('keydown', onKey)
--  })
-+  }, [currentStep, state, saving, step])
- 
-   function canAdvance(): boolean {
-     if (step === 'intent') return state.intent.trim().length > 0
-@@ -85,15 +116,61 @@ function DrillContent() {
-     return false
-   }
- 
--  function handleDecision(decision: Decision) {
-+  async function handleDecision(decision: Decision) {
-     const newState = { ...state, decision }
-     setState(newState)
--    if (decision === 'arena') {
--      router.push(`${ROUTES.drillSuccess}?ideaId=${ideaId}`)
--    } else if (decision === 'killed') {
--      router.push(`${ROUTES.drillEnd}?ideaId=${ideaId}`)
--    } else {
--      router.push(`${ROUTES.icebox}`)
-+    await saveDrillAndNavigate(decision)
-+  }
-+
-+  async function saveDrillAndNavigate(decision: Decision) {
-+    setSaving(true)
-+    setErrorMsg(null)
-+
-+    try {
-+      const payload = {
-+        ideaId,
-+        intent: state.intent,
-+        successMetric: state.successMetric,
-+        scope: state.scope,
-+        executionPath: state.executionPath,
-+        urgencyDecision: state.urgency,
-+        finalDisposition: decision,
-+      }
-+
-+      const res = await fetch('/api/drill', {
-+        method: 'POST',
-+        headers: { 'Content-Type': 'application/json' },
-+        body: JSON.stringify(payload),
-+      })
-+
-+      if (!res.ok) {
-+        const data = await res.json()
-+        throw new Error(data.error || 'Failed to save drill session')
-+      }
-+
-+      // W5: Update status before navigation for icebox/killed
-+      if (decision === 'killed' || decision === 'icebox') {
-+        const endpoint = decision === 'killed' ? '/api/actions/kill-idea' : '/api/actions/move-to-icebox'
-+        const statusRes = await fetch(endpoint, {
-+          method: 'POST',
-+          headers: { 'Content-Type': 'application/json' },
-+          body: JSON.stringify({ ideaId }),
-+        })
-+        if (!statusRes.ok) {
-+          throw new Error(`Failed to update idea status to ${decision}`)
-+        }
-+      }
-+
-+      if (decision === 'arena') {
-+        router.push(`${ROUTES.drillSuccess}?ideaId=${ideaId}`)
-+      } else if (decision === 'killed') {
-+        router.push(`${ROUTES.drillEnd}?ideaId=${ideaId}`)
-+      } else {
-+        router.push(ROUTES.icebox)
-+      }
-+    } catch (err: any) {
-+      setErrorMsg(err.message)
-+      setSaving(false)
-     }
-   }
- 
-@@ -108,6 +185,8 @@ function DrillContent() {
-       }
-     >
-       <div className="space-y-8">
-+        {idea && <IdeaContextCard idea={idea} />}
-+        
-         {step === 'intent' && (
-           <StepText
-             question="What is this really?"
-@@ -219,28 +298,41 @@ function DrillContent() {
-               <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{"What's the call?"}</h2>
-               <p className="text-[#94a3b8]">Arena, Icebox, or Remove. No limbo.</p>
-             </div>
--            <div className="space-y-3">
-+            {errorMsg && (
-+              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
-+                {errorMsg}
-+              </div>
-+            )}
-+            <div className="space-y-3 relative">
-+              {saving && (
-+                <div className="absolute inset-0 bg-[#0a0a0f]/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl border border-indigo-500/20">
-+                  <span className="text-indigo-300 font-medium animate-pulse">Saving session…</span>
-+                </div>
-+              )}
-               <GiantChoiceButton
-                 label="Commit to Arena"
-                 description="This gets built. Now."
-                 onClick={() => handleDecision('arena')}
-                 variant="success"
-+                disabled={saving}
-               />
-               <GiantChoiceButton
-                 label="Send to Icebox"
-                 description="Not now. Maybe later."
-                 onClick={() => handleDecision('icebox')}
-                 variant="ice"
-+                disabled={saving}
-               />
-               <GiantChoiceButton
-                 label="Remove this idea"
-                 description="It's not worth pursuing. Let it go."
-                 onClick={() => handleDecision('killed')}
-                 variant="danger"
-+                disabled={saving}
-               />
-             </div>
-             <div className="mt-6">
--              <button onClick={back} className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">
-+              <button onClick={back} disabled={saving} className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors disabled:opacity-50">
-                 ← Back
-               </button>
-             </div>
-diff --git a/app/drill/success/page.tsx b/app/drill/success/page.tsx
-index 2452005..df02e5c 100644
---- a/app/drill/success/page.tsx
-+++ b/app/drill/success/page.tsx
-@@ -1,36 +1,99 @@
- 'use client'
- 
--import { useEffect, useState } from 'react'
--import { useRouter } from 'next/navigation'
-+import { useEffect, useState, Suspense } from 'react'
-+import { useRouter, useSearchParams } from 'next/navigation'
-+import Link from 'next/link'
- import { MaterializationSequence } from '@/components/drill/materialization-sequence'
- import { ROUTES } from '@/lib/routes'
-+import type { Project } from '@/types/project'
-+import type { ApiResponse } from '@/types/api'
- 
- export default function DrillSuccessPage() {
--  const router = useRouter()
--  const [done, setDone] = useState(false)
-+  return (
-+    <Suspense fallback={
-+      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
-+        <p className="text-[#94a3b8]">Loading…</p>
-+      </div>
-+    }>
-+      <DrillSuccessContent />
-+    </Suspense>
-+  )
-+}
-+
-+function DrillSuccessContent() {
-+  const searchParams = useSearchParams()
-+  const ideaId = searchParams.get('ideaId')
-+  
-+  const [createdProject, setCreatedProject] = useState<Project | null>(null)
-+  const [error, setError] = useState<string | null>(null)
-+  const [loading, setLoading] = useState(true)
- 
-   useEffect(() => {
--    if (done) {
--      const timer = setTimeout(() => {
--        router.push(ROUTES.arena)
--      }, 800)
--      return () => clearTimeout(timer)
-+    if (!ideaId) {
-+      setError('Missing ideaId')
-+      setLoading(false)
-+      return
-+    }
-+
-+    async function materialize() {
-+      try {
-+        const res = await fetch('/api/ideas/materialize', {
-+          method: 'POST',
-+          headers: { 'Content-Type': 'application/json' },
-+          body: JSON.stringify({ ideaId }),
-+        })
-+        
-+        const data = await res.json() as ApiResponse<Project>
-+        if (!res.ok) throw new Error(data.error || 'Failed to materialize idea')
-+        
-+        setCreatedProject(data.data!)
-+      } catch (err: any) {
-+        setError(err.message)
-+      } finally {
-+        setLoading(false)
-+      }
-     }
--  }, [done, router])
-+
-+    materialize()
-+  }, [ideaId])
- 
-   return (
-     <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
--      <div className="max-w-sm w-full">
-+      <div className="max-w-md w-full">
-         <div className="mb-8">
-           <div className="text-4xl mb-4">◈</div>
-           <h1 className="text-2xl font-bold text-[#e2e8f0] mb-1">Committed.</h1>
--          <p className="text-[#94a3b8] text-sm">Setting up your project…</p>
--        </div>
--        <MaterializationSequence onComplete={() => setDone(true)} />
--        {done && (
--          <p className="text-xs text-emerald-400 mt-6 animate-pulse">
--            Redirecting to Arena…
-+          <p className="text-[#94a3b8] text-sm">
-+            {loading ? 'Setting up your project…' : createdProject ? 'Your project is ready.' : 'Something went wrong.'}
-           </p>
-+        </div>
-+
-+        {loading && <MaterializationSequence onComplete={() => {}} />}
-+        
-+        {error && (
-+          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
-+            {error}
-+          </div>
-+        )}
-+
-+        {createdProject && (
-+          <div className="bg-[#12121a] border border-indigo-500/30 rounded-2xl p-6 shadow-2xl shadow-indigo-500/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
-+             <div className="text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">Project Created</div>
-+             <h2 className="text-xl font-bold text-[#f8fafc] mb-4">{createdProject.name}</h2>
-+             <Link 
-+               href={ROUTES.arenaProject(createdProject.id)}
-+               className="inline-flex items-center justify-center w-full px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25 group"
-+             >
-+               Go to Arena
-+               <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
-+             </Link>
-+          </div>
-+        )}
-+
-+        {(error || (!loading && !createdProject)) && (
-+          <Link href={ROUTES.send} className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors underline underline-offset-4">
-+            Back to Ideas
-+          </Link>
-         )}
-       </div>
-     </div>
-diff --git a/app/globals.css b/app/globals.css
-index 945e3e9..9598d20 100644
---- a/app/globals.css
-+++ b/app/globals.css
-@@ -9,6 +9,10 @@
-   --studio-accent: #6366f1;
-   --studio-text: #e2e8f0;
-   --studio-text-muted: #94a3b8;
-+  --studio-success: #10b981;
-+  --studio-warning: #f59e0b;
-+  --studio-danger: #ef4444;
-+  --studio-ice: #38bdf8;
- }
- 
- * {
-diff --git a/app/icebox/page.tsx b/app/icebox/page.tsx
-index 9cfb46a..6d55814 100644
---- a/app/icebox/page.tsx
-+++ b/app/icebox/page.tsx
-@@ -5,22 +5,24 @@ import { AppShell } from '@/components/shell/app-shell'
- import { EmptyState } from '@/components/common/empty-state'
- import { IceboxCard } from '@/components/icebox/icebox-card'
- 
--export default function IceboxPage() {
--  const ideas = getIdeas()
--  const projects = getProjects()
-+import { COPY } from '@/lib/studio-copy'
-+
-+export default async function IceboxPage() {
-+  const ideas = await getIdeas()
-+  const projects = await getProjects()
-   const items = buildIceboxViewModel(ideas, projects)
- 
-   return (
-     <AppShell>
-       <div className="max-w-2xl mx-auto">
-         <div className="mb-6">
--          <h1 className="text-2xl font-bold text-[#e2e8f0]">Icebox</h1>
--          <p className="text-sm text-[#94a3b8] mt-1">Deferred ideas and projects</p>
-+          <h1 className="text-2xl font-bold text-[#e2e8f0]">{COPY.icebox.heading}</h1>
-+          <p className="text-sm text-[#94a3b8] mt-1">{COPY.icebox.subheading}</p>
-         </div>
- 
-         {items.length === 0 ? (
-           <EmptyState
--            title="Nothing frozen"
-+            title={COPY.icebox.empty}
-             description="Ideas are either in play or gone. Nothing deferred right now."
-             icon="❄"
-           />
-diff --git a/app/killed/page.tsx b/app/killed/page.tsx
-index 1c4a497..8c06b84 100644
---- a/app/killed/page.tsx
-+++ b/app/killed/page.tsx
-@@ -3,21 +3,23 @@ import { AppShell } from '@/components/shell/app-shell'
- import { EmptyState } from '@/components/common/empty-state'
- import { GraveyardCard } from '@/components/archive/graveyard-card'
- 
--export default function KilledPage() {
--  const projects = getProjectsByState('killed')
-+import { COPY } from '@/lib/studio-copy'
-+
-+export default async function KilledPage() {
-+  const projects = await getProjectsByState('killed')
- 
-   return (
-     <AppShell>
-       <div className="max-w-2xl mx-auto">
-         <div className="mb-6">
--          <h1 className="text-2xl font-bold text-[#e2e8f0]">Graveyard</h1>
--          <p className="text-sm text-[#94a3b8] mt-1">Removed projects</p>
-+          <h1 className="text-2xl font-bold text-[#e2e8f0]">{COPY.killed.heading}</h1>
-+          <p className="text-sm text-[#94a3b8] mt-1">Projects removed from focus</p>
-         </div>
- 
-         {projects.length === 0 ? (
-           <EmptyState
--            title="Nothing removed"
--            description="Good ideas die too — that's how focus works."
-+            title={COPY.killed.empty}
-+            description="Ideas that were put to rest live here."
-             icon="†"
-           />
-         ) : (
-diff --git a/app/layout.tsx b/app/layout.tsx
-index 4f5d451..244243b 100644
---- a/app/layout.tsx
-+++ b/app/layout.tsx
-@@ -1,9 +1,11 @@
- import type { Metadata } from 'next'
- import './globals.css'
- 
-+import { COPY } from '@/lib/studio-copy'
-+
- export const metadata: Metadata = {
-   title: 'Mira Studio',
--  description: 'Chat is where ideas are born. Studio is where ideas are forced into truth.',
-+  description: COPY.app.tagline,
- }
- 
- export default function RootLayout({
-diff --git a/app/page.tsx b/app/page.tsx
-index 0cd87f5..42c2021 100644
---- a/app/page.tsx
-+++ b/app/page.tsx
-@@ -1,69 +1,192 @@
- import { getIdeasByStatus } from '@/lib/services/ideas-service'
- import { getArenaProjects } from '@/lib/services/projects-service'
-+import { getInboxEvents } from '@/lib/services/inbox-service'
- import { AppShell } from '@/components/shell/app-shell'
--import { EmptyState } from '@/components/common/empty-state'
- import Link from 'next/link'
- import { ROUTES } from '@/lib/routes'
-+import { formatRelativeTime } from '@/lib/date'
-+import type { Project } from '@/types/project'
-+import type { InboxEvent } from '@/types/inbox'
- 
--export default function HomePage() {
--  const captured = getIdeasByStatus('captured')
--  const arenaProjects = getArenaProjects()
-+function HealthDot({ health }: { health: Project['health'] }) {
-+  const colorMap = {
-+    green: 'bg-emerald-400',
-+    yellow: 'bg-amber-400',
-+    red: 'bg-red-400',
-+  }
-+  return (
-+    <span
-+      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colorMap[health]}`}
-+      aria-label={`health: ${health}`}
-+    />
-+  )
-+}
-+
-+function SeverityIcon({ severity }: { severity: InboxEvent['severity'] }) {
-+  const map = { info: '○', warning: '◉', error: '◈', success: '●' }
-+  const colorMap = {
-+    info: 'text-indigo-400',
-+    warning: 'text-amber-400',
-+    error: 'text-red-400',
-+    success: 'text-emerald-400',
-+  }
-+  return <span className={`text-xs ${colorMap[severity]}`}>{map[severity]}</span>
-+}
-+
-+export default async function HomePage() {
-+  const captured = await getIdeasByStatus('captured')
-+  const arenaProjects = await getArenaProjects()
-+  const allEvents = await getInboxEvents()
-+  const recentEvents = allEvents.slice(0, 3)
-+
-+  const needsAttentionProjects = arenaProjects.filter(
-+    (p) => p.health === 'red' || p.health === 'yellow'
-+  )
-+  const nothingNeedsAttention = captured.length === 0 && needsAttentionProjects.length === 0
- 
-   return (
-     <AppShell>
--      {arenaProjects.length > 0 ? (
--        <div className="max-w-2xl mx-auto">
--          <div className="mb-8">
--            <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">Studio</h1>
--            <p className="text-[#94a3b8]">
--              {arenaProjects.length} project{arenaProjects.length !== 1 ? 's' : ''} in progress
--              {captured.length > 0 && ` · ${captured.length} idea${captured.length !== 1 ? 's' : ''} waiting`}
--            </p>
--          </div>
--          <div className="space-y-3">
--            {captured.length > 0 && (
--              <Link
--                href={ROUTES.send}
--                className="flex items-center justify-between p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/15 transition-colors group"
--              >
--                <div>
--                  <div className="text-sm font-medium text-indigo-300 mb-1">New idea waiting</div>
--                  <div className="text-xs text-indigo-400/70">
--                    {captured.length} idea{captured.length !== 1 ? 's' : ''} to define
-+      <div className="max-w-2xl mx-auto space-y-10">
-+        {/* Page title */}
-+        <div>
-+          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-1">Studio</h1>
-+          <p className="text-[#64748b] text-sm">Your attention cockpit.</p>
-+        </div>
-+
-+        {/* ── Section 1: Needs Attention ── */}
-+        <section>
-+          <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-4">
-+            Needs attention
-+          </h2>
-+
-+          {nothingNeedsAttention ? (
-+            <div className="flex items-center gap-3 px-5 py-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl text-sm text-[#4a4a6a]">
-+              <span className="text-emerald-400">✓</span>
-+              You&apos;re all caught up.
-+            </div>
-+          ) : (
-+            <div className="space-y-3">
-+              {/* Captured ideas */}
-+              {captured.map((idea) => (
-+                <Link
-+                  key={idea.id}
-+                  href={ROUTES.send}
-+                  className="flex items-center justify-between gap-4 px-5 py-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/10 transition-colors group"
-+                >
-+                  <div className="min-w-0">
-+                    <div className="text-xs font-medium text-indigo-400 mb-0.5">New idea waiting</div>
-+                    <div className="text-sm font-semibold text-[#e2e8f0] truncate">{idea.title}</div>
-+                    <div className="text-xs text-[#94a3b8] mt-0.5 font-medium">Define this →</div>
-                   </div>
--                </div>
--                <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
-+                  <span className="text-indigo-400 group-hover:translate-x-1 transition-transform flex-shrink-0">→</span>
-+                </Link>
-+              ))}
-+
-+              {/* Unhealthy projects */}
-+              {needsAttentionProjects.map((project) => (
-+                <Link
-+                  key={project.id}
-+                  href={ROUTES.arenaProject(project.id)}
-+                  className="flex items-center justify-between gap-4 px-5 py-4 bg-[#12121a] border border-[#1e1e2e] rounded-xl hover:border-amber-500/30 transition-colors group"
-+                >
-+                  <div className="flex items-center gap-3 min-w-0">
-+                    <HealthDot health={project.health} />
-+                    <div className="min-w-0">
-+                      <div className="text-sm font-semibold text-[#e2e8f0] truncate">{project.name}</div>
-+                      <div className="text-xs text-amber-400 mt-0.5 font-medium">{project.nextAction}</div>
-+                    </div>
-+                  </div>
-+                  <span className="text-[#4a4a6a] group-hover:translate-x-1 transition-transform flex-shrink-0">→</span>
-+                </Link>
-+              ))}
-+            </div>
-+          )}
-+        </section>
-+
-+        {/* ── Section 2: In Progress ── */}
-+        <section>
-+          <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-4">
-+            In progress
-+          </h2>
-+
-+          {arenaProjects.length === 0 ? (
-+            <div className="px-5 py-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl text-sm text-[#4a4a6a]">
-+              No active projects.{' '}
-+              <Link href={ROUTES.send} className="text-indigo-400 hover:text-indigo-300">
-+                Define an idea →
-               </Link>
--            )}
--            <Link
--              href={ROUTES.arena}
--              className="flex items-center justify-between p-4 bg-[#12121a] border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-colors group"
--            >
--              <div>
--                <div className="text-sm font-medium text-[#e2e8f0] mb-1">View In Progress</div>
--                <div className="text-xs text-[#94a3b8]">
--                  {arenaProjects.length} active project{arenaProjects.length !== 1 ? 's' : ''}
--                </div>
--              </div>
--              <span className="text-[#6366f1] group-hover:translate-x-1 transition-transform">→</span>
-+            </div>
-+          ) : (
-+            <div className="space-y-3">
-+              {arenaProjects.map((project) => (
-+                <Link
-+                  key={project.id}
-+                  href={ROUTES.arenaProject(project.id)}
-+                  className="flex items-center justify-between gap-4 px-5 py-4 bg-[#12121a] border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-colors group"
-+                >
-+                  <div className="flex items-center gap-3 min-w-0">
-+                    <HealthDot health={project.health} />
-+                    <div className="min-w-0">
-+                      <div className="text-sm font-semibold text-[#e2e8f0] truncate">{project.name}</div>
-+                      <div className="text-xs text-[#64748b] mt-0.5">
-+                        {project.currentPhase}
-+                        {project.nextAction && (
-+                          <span className="text-[#94a3b8]"> · {project.nextAction}</span>
-+                        )}
-+                      </div>
-+                    </div>
-+                  </div>
-+                  <span className="text-[#4a4a6a] group-hover:translate-x-1 transition-transform flex-shrink-0">→</span>
-+                </Link>
-+              ))}
-+            </div>
-+          )}
-+        </section>
-+
-+        {/* ── Section 3: Recent Activity ── */}
-+        <section>
-+          <div className="flex items-center justify-between mb-4">
-+            <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest">
-+              Recent activity
-+            </h2>
-+            <Link href={ROUTES.inbox} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
-+              See all →
-             </Link>
-           </div>
--        </div>
--      ) : (
--        <EmptyState
--          title="Mira Studio"
--          description="Chat is where ideas are born. Studio is where ideas are forced into truth. Send an idea from the GPT to get started."
--          icon="◈"
--          action={
--            <Link
--              href={ROUTES.send}
--              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-500/30 transition-colors"
--            >
--              + Define an Idea
--            </Link>
--          }
--        />
--      )}
-+
-+          {recentEvents.length === 0 ? (
-+            <div className="px-5 py-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl text-sm text-[#4a4a6a]">
-+              No recent activity.
-+            </div>
-+          ) : (
-+            <div className="space-y-2">
-+              {recentEvents.map((event) => (
-+                <div
-+                  key={event.id}
-+                  className="flex items-center gap-3 px-5 py-3 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl"
-+                >
-+                  <SeverityIcon severity={event.severity} />
-+                  <div className="flex-1 min-w-0">
-+                    {event.actionUrl ? (
-+                      <Link
-+                        href={event.actionUrl}
-+                        className="text-sm text-[#cbd5e1] hover:text-indigo-300 transition-colors truncate block"
-+                      >
-+                        {event.title}
-+                      </Link>
-+                    ) : (
-+                      <span className="text-sm text-[#cbd5e1] truncate block">{event.title}</span>
-+                    )}
-+                  </div>
-+                  <span className="text-xs text-[#4a4a6a] flex-shrink-0">
-+                    {formatRelativeTime(event.timestamp)}
-+                  </span>
-+                </div>
-+              ))}
-+            </div>
-+          )}
-+        </section>
-+      </div>
-     </AppShell>
-   )
- }
-diff --git a/app/review/[prId]/page.tsx b/app/review/[prId]/page.tsx
-index 6add0b9..d5336a1 100644
---- a/app/review/[prId]/page.tsx
-+++ b/app/review/[prId]/page.tsx
-@@ -8,7 +8,8 @@ import { PRSummaryCard } from '@/components/review/pr-summary-card'
- import { DiffSummary } from '@/components/review/diff-summary'
- import { BuildStatusChip } from '@/components/review/build-status-chip'
- import { FixRequestBox } from '@/components/review/fix-request-box'
--import { PreviewToolbar } from '@/components/review/preview-toolbar'
-+import { MergeActions } from '@/components/review/merge-actions'
-+import { PreviewFrame } from '@/components/arena/preview-frame'
- import Link from 'next/link'
- import { ROUTES } from '@/lib/routes'
- 
-@@ -17,57 +18,64 @@ interface Props {
- }
- 
- export default async function ReviewPage({ params }: Props) {
--  const pr = await getPRById(params.prId)
--  if (!pr) notFound()
-+  const prResult = await getPRById(params.prId)
-+  if (!prResult) notFound()
-+  // After notFound(), TypeScript doesn't know execution stops, so we re-assign
-+  const pr = prResult as NonNullable<typeof prResult>
- 
--  const project = getProjectById(pr.projectId)
-+  const project = await getProjectById(pr.projectId)
-   const vm = buildReviewViewModel(pr, project)
- 
-+  const breadcrumb = (
-+    <div className="flex items-center gap-2 text-sm">
-+      {project && (
-+        <>
-+          <Link
-+            href={ROUTES.arenaProject(project.id)}
-+            className="text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
-+          >
-+            ← {project.name}
-+          </Link>
-+          <span className="text-[#1e1e2e]">/</span>
-+        </>
-+      )}
-+      <h1 className="font-medium text-[#e2e8f0]">Review PR #{pr.number}</h1>
-+    </div>
-+  )
-+
-+  const preview = <PreviewFrame previewUrl={pr.previewUrl} />
-+
-+  const sidebar = (
-+    <>
-+      <PRSummaryCard pr={pr} />
-+
-+      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
-+        <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">
-+          Build Status
-+        </h3>
-+        <BuildStatusChip state={pr.buildState} />
-+      </div>
-+
-+      <DiffSummary />
-+
-+      <MergeActions
-+        prId={pr.id}
-+        canMerge={vm.canMerge}
-+        currentStatus={pr.status}
-+        reviewState={vm.reviewState}
-+      />
-+
-+      <FixRequestBox prId={pr.id} existingRequest={pr.requestedChanges} />
-+    </>
-+  )
-+
-   return (
-     <AppShell>
--      <div className="max-w-5xl mx-auto">
--        <div className="flex items-center gap-3 mb-6">
--          {project && (
--            <>
--              <Link
--                href={ROUTES.arenaProject(project.id)}
--                className="text-[#94a3b8] hover:text-[#e2e8f0] text-sm transition-colors"
--              >
--                ← {project.name}
--              </Link>
--              <span className="text-[#1e1e2e]">/</span>
--            </>
--          )}
--          <h1 className="text-sm font-medium text-[#e2e8f0]">Review PR #{pr.number}</h1>
--        </div>
--
-+      <div className="max-w-7xl mx-auto">
-         <SplitReviewLayout
--          left={
--            <>
--              <PRSummaryCard pr={pr} />
--              <DiffSummary />
--              {pr.previewUrl && <PreviewToolbar url={pr.previewUrl} />}
--            </>
--          }
--          right={
--            <>
--              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
--                <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">
--                  Build Status
--                </h3>
--                <BuildStatusChip state={pr.buildState} />
--                <div className="mt-4">
--                  <button
--                    disabled={!vm.canMerge}
--                    className="w-full px-4 py-2.5 text-sm font-medium bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
--                  >
--                    Merge PR
--                  </button>
--                </div>
--              </div>
--              <FixRequestBox />
--            </>
--          }
-+          breadcrumb={breadcrumb}
-+          preview={preview}
-+          sidebar={sidebar}
-         />
-       </div>
-     </AppShell>
-diff --git a/app/send/page.tsx b/app/send/page.tsx
-index 8dc70b7..a367461 100644
---- a/app/send/page.tsx
-+++ b/app/send/page.tsx
-@@ -1,15 +1,14 @@
- import { AppShell } from '@/components/shell/app-shell'
- import { getIdeasByStatus } from '@/lib/services/ideas-service'
- import { EmptyState } from '@/components/common/empty-state'
--import { CapturedIdeaCard } from '@/components/send/captured-idea-card'
-+import { SendPageClient } from '@/components/send/send-page-client'
- import Link from 'next/link'
- import { ROUTES } from '@/lib/routes'
- 
--export default function SendPage() {
--  const ideas = getIdeasByStatus('captured')
--  const idea = ideas[0]
-+export default async function SendPage() {
-+  const ideas = await getIdeasByStatus('captured')
- 
--  if (!idea) {
-+  if (ideas.length === 0) {
-     return (
-       <AppShell>
-         <EmptyState
-@@ -30,10 +29,12 @@ export default function SendPage() {
-     <AppShell>
-       <div className="max-w-xl mx-auto">
-         <div className="mb-6">
--          <h1 className="text-2xl font-bold text-[#e2e8f0] mb-1">Idea captured.</h1>
--          <p className="text-[#94a3b8] text-sm">Define it or let it go.</p>
-+          <h1 className="text-2xl font-bold text-[#e2e8f0] mb-1">
-+            {ideas.length} idea{ideas.length !== 1 ? 's' : ''} waiting
-+          </h1>
-+          <p className="text-[#94a3b8] text-sm">Define each one or let it go.</p>
-         </div>
--        <CapturedIdeaCard idea={idea} />
-+        <SendPageClient ideas={ideas} />
-       </div>
-     </AppShell>
-   )
-diff --git a/app/shipped/page.tsx b/app/shipped/page.tsx
-index afe7b82..bcabb70 100644
---- a/app/shipped/page.tsx
-+++ b/app/shipped/page.tsx
-@@ -3,14 +3,16 @@ import { AppShell } from '@/components/shell/app-shell'
- import { EmptyState } from '@/components/common/empty-state'
- import { TrophyCard } from '@/components/archive/trophy-card'
- 
--export default function ShippedPage() {
--  const projects = getProjectsByState('shipped')
-+import { COPY } from '@/lib/studio-copy'
-+
-+export default async function ShippedPage() {
-+  const projects = await getProjectsByState('shipped')
- 
-   return (
-     <AppShell>
-       <div className="max-w-2xl mx-auto">
-         <div className="mb-6">
--          <h1 className="text-2xl font-bold text-[#e2e8f0]">Trophy Room</h1>
-+          <h1 className="text-2xl font-bold text-[#e2e8f0]">{COPY.shipped.heading}</h1>
-           <p className="text-sm text-[#94a3b8] mt-1">
-             {projects.length} shipped project{projects.length !== 1 ? 's' : ''}
-           </p>
-@@ -18,8 +20,8 @@ export default function ShippedPage() {
- 
-         {projects.length === 0 ? (
-           <EmptyState
--            title="Nothing shipped yet"
--            description="Get one idea to the finish line."
-+            title={COPY.shipped.empty}
-+            description="Your completed work lives here."
-             icon="✦"
-           />
-         ) : (
-diff --git a/components/archive/graveyard-card.tsx b/components/archive/graveyard-card.tsx
-index d249387..9203c95 100644
---- a/components/archive/graveyard-card.tsx
-+++ b/components/archive/graveyard-card.tsx
-@@ -1,5 +1,6 @@
- import type { Project } from '@/types/project'
- import { formatDate } from '@/lib/date'
-+import { COPY } from '@/lib/studio-copy'
- 
- interface GraveyardCardProps {
-   project: Project
-@@ -10,7 +11,7 @@ export function GraveyardCard({ project }: GraveyardCardProps) {
-     <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 opacity-70 hover:opacity-100 transition-opacity">
-       <div className="flex items-start justify-between gap-3 mb-3">
-         <div>
--          <span className="text-red-400/70 text-xs font-medium">Removed</span>
-+          <span className="text-red-400/70 text-xs font-medium">{COPY.killed.heading}</span>
-           <h3 className="text-lg font-semibold text-[#e2e8f0] mt-0.5 line-through decoration-[#94a3b8]/40">
-             {project.name}
-           </h3>
-diff --git a/components/archive/trophy-card.tsx b/components/archive/trophy-card.tsx
-index 2086f94..91d1855 100644
---- a/components/archive/trophy-card.tsx
-+++ b/components/archive/trophy-card.tsx
-@@ -1,5 +1,6 @@
- import type { Project } from '@/types/project'
- import { formatDate } from '@/lib/date'
-+import { COPY } from '@/lib/studio-copy'
- 
- interface TrophyCardProps {
-   project: Project
-@@ -10,7 +11,7 @@ export function TrophyCard({ project }: TrophyCardProps) {
-     <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
-       <div className="flex items-start justify-between gap-3 mb-3">
-         <div>
--          <span className="text-emerald-400 text-xs font-medium">Shipped</span>
-+          <span className="text-emerald-400 text-xs font-medium">{COPY.shipped.heading}</span>
-           <h3 className="text-lg font-semibold text-[#e2e8f0] mt-0.5">{project.name}</h3>
-         </div>
-         <span className="text-xl">✦</span>
-diff --git a/components/arena/preview-frame.tsx b/components/arena/preview-frame.tsx
-index 8c6cf8d..5b9e1d5 100644
---- a/components/arena/preview-frame.tsx
-+++ b/components/arena/preview-frame.tsx
-@@ -1,29 +1,99 @@
-+'use client'
-+
-+import { useState, useRef } from 'react'
-+
- interface PreviewFrameProps {
--  url: string
-+  previewUrl?: string
- }
- 
--export function PreviewFrame({ url }: PreviewFrameProps) {
-+export function PreviewFrame({ previewUrl }: PreviewFrameProps) {
-+  const [loading, setLoading] = useState(true)
-+  const [error, setError] = useState(false)
-+  const iframeRef = useRef<HTMLIFrameElement>(null)
-+
-+  function handleRefresh() {
-+    if (iframeRef.current && previewUrl) {
-+      setLoading(true)
-+      setError(false)
-+      iframeRef.current.src = previewUrl
-+    }
-+  }
-+
-+  if (!previewUrl) {
-+    return (
-+      <div className="rounded-xl overflow-hidden border border-[#1e1e2e] bg-[#0a0a0f] flex flex-col items-center justify-center h-[500px]">
-+        <span className="text-3xl mb-3">🖥️</span>
-+        <p className="text-sm font-medium text-[#94a3b8]">No preview deployed yet</p>
-+        <p className="text-xs text-[#94a3b8]/60 mt-1">Preview will appear here once a build is available</p>
-+      </div>
-+    )
-+  }
-+
-   return (
-     <div className="rounded-xl overflow-hidden border border-[#1e1e2e] bg-[#0a0a0f]">
--      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e1e2e]">
-+      {/* Toolbar */}
-+      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e1e2e] bg-[#12121a]">
-         <div className="flex gap-1.5">
-           <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a3a]" />
-           <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a3a]" />
-           <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a3a]" />
-         </div>
--        <span className="text-xs text-[#94a3b8] truncate flex-1">{url}</span>
-+        <span className="text-xs font-medium text-[#94a3b8] px-2 py-0.5 rounded bg-[#0a0a0f] flex-1 truncate">
-+          Preview
-+        </span>
-+        <span className="text-xs text-[#94a3b8] truncate max-w-[200px] hidden sm:block">{previewUrl}</span>
-+        <button
-+          onClick={handleRefresh}
-+          title="Refresh preview"
-+          className="text-xs text-[#94a3b8] hover:text-[#e2e8f0] transition-colors px-1"
-+        >
-+          ↺
-+        </button>
-         <a
--          href={url}
-+          href={previewUrl}
-           target="_blank"
-           rel="noopener noreferrer"
--          className="text-xs text-sky-400 hover:text-sky-300 flex-shrink-0"
-+          className="text-xs text-sky-400 hover:text-sky-300 flex-shrink-0 transition-colors"
-+          title="Open in new tab"
-         >
-           ↗
-         </a>
-       </div>
--      <div className="h-64 flex items-center justify-center">
--        <p className="text-xs text-[#94a3b8]">Preview available at link above</p>
--      </div>
-+
-+      {/* Loading skeleton */}
-+      {loading && !error && (
-+        <div className="h-[500px] flex items-center justify-center bg-[#0a0a0f] animate-pulse">
-+          <div className="text-center">
-+            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mx-auto mb-3" />
-+            <p className="text-xs text-[#94a3b8]">Loading preview…</p>
-+          </div>
-+        </div>
-+      )}
-+
-+      {/* Error state */}
-+      {error && (
-+        <div className="h-[500px] flex flex-col items-center justify-center bg-[#0a0a0f]">
-+          <span className="text-3xl mb-3">⚠️</span>
-+          <p className="text-sm font-medium text-[#94a3b8]">Preview unavailable</p>
-+          <p className="text-xs text-[#94a3b8]/60 mt-1">Server may not be running</p>
-+          <button
-+            onClick={handleRefresh}
-+            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
-+          >
-+            Try again
-+          </button>
-+        </div>
-+      )}
-+
-+      {/* Actual iframe */}
-+      <iframe
-+        ref={iframeRef}
-+        src={previewUrl}
-+        title="Preview"
-+        className={`w-full h-[500px] border-0 bg-white transition-opacity ${loading || error ? 'opacity-0 h-0 absolute' : 'opacity-100'}`}
-+        onLoad={() => setLoading(false)}
-+        onError={() => { setLoading(false); setError(true) }}
-+      />
-     </div>
-   )
- }
-diff --git a/components/arena/project-anchor-pane.tsx b/components/arena/project-anchor-pane.tsx
-index 7c8da28..1d435d9 100644
---- a/components/arena/project-anchor-pane.tsx
-+++ b/components/arena/project-anchor-pane.tsx
-@@ -7,7 +7,7 @@ interface ProjectAnchorPaneProps {
- export function ProjectAnchorPane({ project }: ProjectAnchorPaneProps) {
-   return (
-     <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
--      <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-4">Anchor</h2>
-+      <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-4">What This Is</h2>
-       <h3 className="text-lg font-bold text-[#e2e8f0] mb-2">{project.name}</h3>
-       <p className="text-sm text-[#94a3b8] leading-relaxed mb-4">{project.summary}</p>
-       <div className="space-y-3">
-diff --git a/components/arena/project-engine-pane.tsx b/components/arena/project-engine-pane.tsx
-index 69bae54..11a4002 100644
---- a/components/arena/project-engine-pane.tsx
-+++ b/components/arena/project-engine-pane.tsx
-@@ -9,7 +9,7 @@ export function ProjectEnginePane({ tasks }: ProjectEnginePaneProps) {
-   return (
-     <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
-       <div className="flex items-center justify-between mb-4">
--        <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">Tasks</h2>
-+        <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">What&apos;s Being Done</h2>
-         <span className="text-xs text-[#94a3b8]">{tasks.length} total</span>
-       </div>
-       <IssueList tasks={tasks} />
-diff --git a/components/arena/project-reality-pane.tsx b/components/arena/project-reality-pane.tsx
-index aa837ed..d3f0425 100644
---- a/components/arena/project-reality-pane.tsx
-+++ b/components/arena/project-reality-pane.tsx
-@@ -29,7 +29,7 @@ export function ProjectRealityPane({ prs, project }: ProjectRealityPaneProps) {
-   return (
-     <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
-       <div className="flex items-center justify-between mb-4">
--        <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">Reality</h2>
-+        <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">Check It</h2>
-         {openPRs.length > 0 && (
-           <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">
-             {openPRs.length} open PR{openPRs.length !== 1 ? 's' : ''}
-diff --git a/components/drill/giant-choice-button.tsx b/components/drill/giant-choice-button.tsx
-index ef94525..acc3b67 100644
---- a/components/drill/giant-choice-button.tsx
-+++ b/components/drill/giant-choice-button.tsx
-@@ -4,6 +4,7 @@ interface GiantChoiceButtonProps {
-   selected?: boolean
-   onClick: () => void
-   variant?: 'default' | 'danger' | 'success' | 'ice'
-+  disabled?: boolean
- }
- 
- const variantStyles: Record<string, string> = {
-@@ -26,15 +27,17 @@ export function GiantChoiceButton({
-   selected = false,
-   onClick,
-   variant = 'default',
-+  disabled = false,
- }: GiantChoiceButtonProps) {
-   return (
-     <button
-       onClick={onClick}
-+      disabled={disabled}
-       className={`w-full text-left p-5 rounded-xl border transition-all duration-200 ${
-         selected
-           ? selectedStyles[variant]
-           : `bg-[#12121a] text-[#e2e8f0] ${variantStyles[variant]}`
--      }`}
-+      } ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
-     >
-       <div className="flex items-center gap-3">
-         <div
-diff --git a/components/icebox/icebox-card.tsx b/components/icebox/icebox-card.tsx
-index 3298925..51cb224 100644
---- a/components/icebox/icebox-card.tsx
-+++ b/components/icebox/icebox-card.tsx
-@@ -1,4 +1,5 @@
- import type { IceboxItem } from '@/lib/view-models/icebox-view-model'
-+import { COPY } from '@/lib/studio-copy'
- 
- interface IceboxCardProps {
-   item: IceboxItem
-@@ -29,7 +30,7 @@ export function IceboxCard({ item }: IceboxCardProps) {
-       <p className="text-sm text-[#94a3b8] line-clamp-2">{item.summary}</p>
-       {item.isStale && (
-         <p className="text-xs text-amber-400 mt-2">
--          Stale — time to decide.
-+          {COPY.icebox.staleWarning.replace('{days}', String(item.daysInIcebox))}
-         </p>
-       )}
-     </div>
-diff --git a/components/inbox/inbox-event-card.tsx b/components/inbox/inbox-event-card.tsx
-index 38e9d3c..e1248da 100644
---- a/components/inbox/inbox-event-card.tsx
-+++ b/components/inbox/inbox-event-card.tsx
-@@ -1,6 +1,11 @@
-+'use client'
-+
- import type { InboxEvent } from '@/types/inbox'
- import { TimePill } from '@/components/common/time-pill'
-+import { COPY } from '@/lib/studio-copy'
- import Link from 'next/link'
-+import { useRouter } from 'next/navigation'
-+import { useState } from 'react'
- 
- interface InboxEventCardProps {
-   event: InboxEvent
-@@ -21,27 +26,68 @@ const severityDot: Record<InboxEvent['severity'], string> = {
- }
- 
- export function InboxEventCard({ event }: InboxEventCardProps) {
-+  const router = useRouter()
-+  const [isMarking, setIsMarking] = useState(false)
-+
-+  const handleMarkRead = async (e: React.MouseEvent) => {
-+    e.preventDefault()
-+    e.stopPropagation()
-+    if (isMarking || event.read) return
-+
-+    setIsMarking(true)
-+    try {
-+      await fetch('/api/inbox', {
-+        method: 'PATCH',
-+        headers: { 'Content-Type': 'application/json' },
-+        body: JSON.stringify({ id: event.id }),
-+      })
-+      router.refresh()
-+    } catch (err) {
-+      console.error('Failed to mark read:', err)
-+    } finally {
-+      setIsMarking(false)
-+    }
-+  }
-+
-   const content = (
-     <div
--      className={`bg-[#12121a] border rounded-xl p-4 ${severityStyles[event.severity]} ${
--        !event.read ? 'opacity-100' : 'opacity-60'
--      } hover:opacity-100 transition-opacity`}
-+      className={`bg-[#12121a] border rounded-xl p-4 transition-all ${severityStyles[event.severity]} ${
-+        !event.read ? 'border-l-4 border-l-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.05)]' : 'opacity-60'
-+      } hover:opacity-100 group`}
-     >
-       <div className="flex items-start gap-3">
-         <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityDot[event.severity]}`} />
-         <div className="flex-1 min-w-0">
-           <div className="flex items-start justify-between gap-2 mb-1">
-             <p className="text-sm font-medium text-[#e2e8f0]">{event.title}</p>
--            <TimePill dateString={event.timestamp} />
-+            <div className="flex items-center gap-2">
-+              {!event.read && (
-+                <button
-+                  onClick={handleMarkRead}
-+                  disabled={isMarking}
-+                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#1e1e2e] rounded text-sky-400 transition-all"
-+                  title={COPY.inbox.markRead}
-+                >
-+                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
-+                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
-+                  </svg>
-+                </button>
-+              )}
-+              <TimePill dateString={event.timestamp} />
-+            </div>
-           </div>
--          <p className="text-xs text-[#94a3b8]">{event.body}</p>
-+          <p className="text-xs text-[#94a3b8] leading-relaxed">{event.body}</p>
-         </div>
-       </div>
-     </div>
-   )
- 
-   if (event.actionUrl) {
--    return <Link href={event.actionUrl}>{content}</Link>
-+    return (
-+      <Link href={event.actionUrl} className="block">
-+        {content}
-+      </Link>
-+    )
-   }
- 
-   return content
-diff --git a/components/inbox/inbox-filter-tabs.tsx b/components/inbox/inbox-filter-tabs.tsx
-index 6fd5461..b2ac98b 100644
---- a/components/inbox/inbox-filter-tabs.tsx
-+++ b/components/inbox/inbox-filter-tabs.tsx
-@@ -1,4 +1,4 @@
--'use client'
-+import { COPY } from '@/lib/studio-copy'
- 
- type Filter = 'all' | 'unread' | 'errors'
- 
-@@ -14,9 +14,9 @@ interface InboxFilterTabsProps {
- 
- export function InboxFilterTabs({ filter, onChange, counts }: InboxFilterTabsProps) {
-   const tabs: { value: Filter; label: string }[] = [
--    { value: 'all', label: `All${counts ? ` (${counts.all})` : ''}` },
--    { value: 'unread', label: `Unread${counts ? ` (${counts.unread})` : ''}` },
--    { value: 'errors', label: `Errors${counts ? ` (${counts.errors})` : ''}` },
-+    { value: 'all', label: `${COPY.inbox.filters.all}${counts ? ` (${counts.all})` : ''}` },
-+    { value: 'unread', label: `${COPY.inbox.filters.unread}${counts ? ` (${counts.unread})` : ''}` },
-+    { value: 'errors', label: `${COPY.inbox.filters.errors}${counts ? ` (${counts.errors})` : ''}` },
-   ]
- 
-   return (
-diff --git a/components/review/fix-request-box.tsx b/components/review/fix-request-box.tsx
-index 9e50f36..e2d2350 100644
---- a/components/review/fix-request-box.tsx
-+++ b/components/review/fix-request-box.tsx
-@@ -3,16 +3,52 @@
- import { useState } from 'react'
- 
- interface FixRequestBoxProps {
--  onSubmit?: (message: string) => void
-+  prId: string
-+  existingRequest?: string
- }
- 
--export function FixRequestBox({ onSubmit }: FixRequestBoxProps) {
-+export function FixRequestBox({ prId, existingRequest }: FixRequestBoxProps) {
-   const [value, setValue] = useState('')
-+  const [submitting, setSubmitting] = useState(false)
-+  const [submitted, setSubmitted] = useState(false)
-+  const [submittedText, setSubmittedText] = useState(existingRequest ?? '')
-+  const [error, setError] = useState<string | null>(null)
- 
--  function handleSubmit() {
--    if (!value.trim()) return
--    onSubmit?.(value)
--    setValue('')
-+  // If there's already a requested change, show it as submitted
-+  if (submittedText && (submitted || existingRequest)) {
-+    return (
-+      <div className="bg-[#12121a] border border-amber-500/20 rounded-xl p-4">
-+        <h3 className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-2">
-+          Changes Requested
-+        </h3>
-+        <p className="text-sm text-[#e2e8f0] leading-relaxed">{submittedText}</p>
-+      </div>
-+    )
-+  }
-+
-+  async function handleSubmit() {
-+    if (!value.trim() || submitting) return
-+    setSubmitting(true)
-+    setError(null)
-+    try {
-+      const res = await fetch('/api/prs', {
-+        method: 'PATCH',
-+        headers: { 'Content-Type': 'application/json' },
-+        body: JSON.stringify({ prId, requestedChanges: value.trim(), reviewStatus: 'changes_requested' }),
-+      })
-+      const json = await res.json()
-+      if (!res.ok) {
-+        setError(json.error ?? 'Failed to submit request')
-+      } else {
-+        setSubmittedText(value.trim())
-+        setSubmitted(true)
-+        setValue('')
-+      }
-+    } catch {
-+      setError('Network error. Please try again.')
-+    } finally {
-+      setSubmitting(false)
-+    }
-   }
- 
-   return (
-@@ -27,12 +63,13 @@ export function FixRequestBox({ onSubmit }: FixRequestBoxProps) {
-         rows={3}
-         className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#94a3b8]/50 resize-none focus:outline-none focus:border-indigo-500/40 transition-colors"
-       />
-+      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
-       <button
-         onClick={handleSubmit}
--        disabled={!value.trim()}
-+        disabled={!value.trim() || submitting}
-         className="mt-2 px-4 py-2 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
-       >
--        Send fix request
-+        {submitting ? 'Sending…' : 'Send fix request'}
-       </button>
-     </div>
-   )
-diff --git a/components/review/split-review-layout.tsx b/components/review/split-review-layout.tsx
-index 08f77be..489d790 100644
---- a/components/review/split-review-layout.tsx
-+++ b/components/review/split-review-layout.tsx
-@@ -1,13 +1,29 @@
--interface SplitReviewLayoutProps {
--  left: React.ReactNode
--  right: React.ReactNode
-+import React from 'react'
-+
-+interface ReviewLayoutProps {
-+  breadcrumb: React.ReactNode
-+  preview: React.ReactNode
-+  sidebar: React.ReactNode
- }
- 
--export function SplitReviewLayout({ left, right }: SplitReviewLayoutProps) {
-+export function SplitReviewLayout({ breadcrumb, preview, sidebar }: ReviewLayoutProps) {
-   return (
--    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
--      <div className="flex flex-col gap-4">{left}</div>
--      <div className="flex flex-col gap-4">{right}</div>
-+    <div className="flex flex-col gap-4 h-full">
-+      {/* Breadcrumb */}
-+      <div>{breadcrumb}</div>
-+
-+      {/* Main content: preview hero + sidebar */}
-+      <div className="flex flex-col lg:flex-row gap-4 items-start">
-+        {/* Preview — ~65% width on desktop, full width on mobile */}
-+        <div className="w-full lg:w-[65%] flex-shrink-0">
-+          {preview}
-+        </div>
-+
-+        {/* Sidebar — ~35% width on desktop, full width on mobile */}
-+        <div className="w-full lg:w-[35%] flex flex-col gap-4">
-+          {sidebar}
-+        </div>
-+      </div>
-     </div>
-   )
- }
-diff --git a/components/send/captured-idea-card.tsx b/components/send/captured-idea-card.tsx
-index 3f79b15..4bda60f 100644
---- a/components/send/captured-idea-card.tsx
-+++ b/components/send/captured-idea-card.tsx
-@@ -7,41 +7,70 @@ import { ROUTES } from '@/lib/routes'
- 
- interface CapturedIdeaCardProps {
-   idea: Idea
-+  onHold?: (ideaId: string) => void
-+  onRemove?: (ideaId: string) => void
- }
- 
--export function CapturedIdeaCard({ idea }: CapturedIdeaCardProps) {
-+export function CapturedIdeaCard({ idea, onHold, onRemove }: CapturedIdeaCardProps) {
-   return (
-     <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden">
-       <div className="p-6">
--        <div className="flex items-start justify-between gap-4 mb-4">
--          <h2 className="text-xl font-semibold text-[#e2e8f0]">{idea.title}</h2>
-+        {/* Header: title + timestamp */}
-+        <div className="flex items-start justify-between gap-4 mb-3">
-+          <h2 className="text-xl font-bold text-[#e2e8f0] leading-snug">{idea.title}</h2>
-           <TimePill dateString={idea.createdAt} />
-         </div>
--        <p className="text-sm text-[#94a3b8] mb-4 leading-relaxed">{idea.gptSummary}</p>
--        {idea.intent && (
--          <div className="p-3 bg-[#0a0a0f] rounded-lg border border-[#1e1e2e] mb-4">
--            <p className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1">Intent</p>
--            <p className="text-sm text-[#e2e8f0]">{idea.intent}</p>
--          </div>
-+
-+        {/* GPT Summary */}
-+        <p className="text-sm text-[#cbd5e1] mb-4 leading-relaxed">{idea.gptSummary}</p>
-+
-+        {/* Raw prompt as blockquote */}
-+        {idea.rawPrompt && (
-+          <blockquote className="border-l-2 border-[#2e2e42] pl-3 mb-4">
-+            <p className="text-xs text-[#64748b] italic leading-relaxed">&ldquo;{idea.rawPrompt}&rdquo;</p>
-+          </blockquote>
-         )}
--        <div className="flex flex-wrap gap-2 text-xs text-[#94a3b8]">
--          {idea.vibe && <span className="px-2 py-1 bg-[#1e1e2e] rounded">vibe: {idea.vibe}</span>}
--          {idea.audience && <span className="px-2 py-1 bg-[#1e1e2e] rounded">for: {idea.audience}</span>}
-+
-+        {/* Vibe + Audience chips */}
-+        <div className="flex flex-wrap gap-2 mb-2">
-+          {idea.vibe && (
-+            <span className="px-2 py-1 text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
-+              {idea.vibe}
-+            </span>
-+          )}
-+          {idea.audience && (
-+            <span className="px-2 py-1 text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
-+              for: {idea.audience}
-+            </span>
-+          )}
-         </div>
-       </div>
-+
-+      {/* Next action label */}
-+      <div className="px-6 py-2 bg-[#0a0a10] border-t border-[#1e1e2e]">
-+        <span className="text-xs text-indigo-400 font-medium tracking-wide uppercase">Next: Define this idea →</span>
-+      </div>
-+
-+      {/* Actions */}
-       <div className="p-4 border-t border-[#1e1e2e] flex flex-col gap-2">
-         <Link
-           href={`${ROUTES.drill}?ideaId=${idea.id}`}
-           className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm font-semibold hover:bg-indigo-500/30 transition-colors"
-         >
--          Define in Studio →
-+          Define this →
-         </Link>
-         <div className="flex gap-2">
--          <button className="flex-1 px-4 py-2 text-xs text-[#94a3b8] border border-[#1e1e2e] rounded-lg hover:border-[#2a2a3a] hover:text-[#e2e8f0] transition-colors">
--            Send to Icebox
-+          <button
-+            onClick={() => onHold?.(idea.id)}
-+            className="flex-1 px-4 py-2 text-xs text-[#94a3b8] border border-[#1e1e2e] rounded-lg hover:border-[#2a2a3a] hover:text-[#e2e8f0] transition-colors"
-+          >
-+            Put on hold
-           </button>
--          <button className="flex-1 px-4 py-2 text-xs text-red-400/70 border border-[#1e1e2e] rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors">
--            Discard idea
-+          <button
-+            onClick={() => onRemove?.(idea.id)}
-+            className="flex-1 px-4 py-2 text-xs text-red-400/70 border border-[#1e1e2e] rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors"
-+          >
-+            Remove
-           </button>
-         </div>
-       </div>
-diff --git a/components/send/idea-summary-panel.tsx b/components/send/idea-summary-panel.tsx
-index 085472c..aa07152 100644
---- a/components/send/idea-summary-panel.tsx
-+++ b/components/send/idea-summary-panel.tsx
-@@ -1,14 +1,95 @@
-+'use client'
-+
-+import { useState } from 'react'
- import type { Idea } from '@/types/idea'
-+import Link from 'next/link'
-+import { ROUTES } from '@/lib/routes'
- 
- interface IdeaSummaryPanelProps {
-   idea: Idea
- }
- 
- export function IdeaSummaryPanel({ idea }: IdeaSummaryPanelProps) {
-+  const [open, setOpen] = useState(true)
-+
-   return (
--    <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-4">
--      <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">Summary</h3>
--      <p className="text-sm text-[#e2e8f0] leading-relaxed">{idea.gptSummary}</p>
-+    <div className="bg-[#0a0a10] border border-[#1e1e2e] rounded-lg overflow-hidden">
-+      {/* Toggle header */}
-+      <button
-+        onClick={() => setOpen((o) => !o)}
-+        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#12121a] transition-colors"
-+        aria-expanded={open}
-+      >
-+        <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest">Idea breakdown</span>
-+        <span className="text-[#4a4a6a] text-sm select-none">{open ? '▲' : '▼'}</span>
-+      </button>
-+
-+      {open && (
-+        <div className="divide-y divide-[#1e1e2e]">
-+          {/* From GPT section */}
-+          <div className="px-4 py-4 border-l-2 border-indigo-500/40">
-+            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">From GPT</h4>
-+            <div className="space-y-3">
-+              <div>
-+                <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Summary</span>
-+                <p className="text-sm text-[#cbd5e1] leading-relaxed">{idea.gptSummary}</p>
-+              </div>
-+              {idea.vibe && (
-+                <div className="flex gap-3">
-+                  <div>
-+                    <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Vibe</span>
-+                    <span className="inline-block px-2 py-0.5 text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
-+                      {idea.vibe}
-+                    </span>
-+                  </div>
-+                  {idea.audience && (
-+                    <div>
-+                      <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Audience</span>
-+                      <span className="inline-block px-2 py-0.5 text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
-+                        {idea.audience}
-+                      </span>
-+                    </div>
-+                  )}
-+                </div>
-+              )}
-+              {idea.rawPrompt && (
-+                <div>
-+                  <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Original prompt</span>
-+                  <blockquote className="border-l-2 border-[#2e2e42] pl-3">
-+                    <p className="text-xs text-[#64748b] italic leading-relaxed">&ldquo;{idea.rawPrompt}&rdquo;</p>
-+                  </blockquote>
-+                </div>
-+              )}
-+            </div>
-+          </div>
-+
-+          {/* Needs your input section */}
-+          <div className="px-4 py-4 border-l-2 border-amber-500/30">
-+            <h4 className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-3">
-+              Needs your input
-+            </h4>
-+            <ul className="space-y-2 mb-4">
-+              {[
-+                { label: 'What does success look like?', key: 'successMetric' },
-+                { label: 'What\'s the scope?', key: 'scope' },
-+                { label: 'How will it get built?', key: 'executionPath' },
-+                { label: 'How urgent is this?', key: 'urgency' },
-+              ].map(({ label }) => (
-+                <li key={label} className="flex items-center gap-2 text-xs text-[#64748b]">
-+                  <span className="w-1.5 h-1.5 rounded-full bg-[#2e2e42] flex-shrink-0" />
-+                  {label}
-+                </li>
-+              ))}
-+            </ul>
-+            <Link
-+              href={`${ROUTES.drill}?ideaId=${idea.id}`}
-+              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
-+            >
-+              → Start defining
-+            </Link>
-+          </div>
-+        </div>
-+      )}
-     </div>
-   )
- }
-diff --git a/components/shell/mobile-nav.tsx b/components/shell/mobile-nav.tsx
-index 718e8dd..e2ea6dd 100644
---- a/components/shell/mobile-nav.tsx
-+++ b/components/shell/mobile-nav.tsx
-@@ -4,11 +4,13 @@ import Link from 'next/link'
- import { usePathname } from 'next/navigation'
- import { ROUTES } from '@/lib/routes'
- 
-+import { COPY } from '@/lib/studio-copy'
-+
- const NAV_ITEMS = [
-   { label: 'Progress', href: ROUTES.arena, icon: '▶' },
--  { label: 'Icebox', href: ROUTES.icebox, icon: '❄' },
--  { label: 'Inbox', href: ROUTES.inbox, icon: '◎' },
--  { label: 'Done', href: ROUTES.shipped, icon: '✦' },
-+  { label: COPY.icebox.heading, href: ROUTES.icebox, icon: '❄' },
-+  { label: COPY.inbox.heading, href: ROUTES.inbox, icon: '◎' },
-+  { label: COPY.shipped.heading, href: ROUTES.shipped, icon: '✦' },
- ]
- 
- export function MobileNav() {
-diff --git a/components/shell/studio-sidebar.tsx b/components/shell/studio-sidebar.tsx
-index fefaf09..8cd7796 100644
---- a/components/shell/studio-sidebar.tsx
-+++ b/components/shell/studio-sidebar.tsx
-@@ -4,12 +4,14 @@ import Link from 'next/link'
- import { usePathname } from 'next/navigation'
- import { ROUTES } from '@/lib/routes'
- 
-+import { COPY } from '@/lib/studio-copy'
-+
- const NAV_ITEMS = [
--  { label: 'Inbox', href: ROUTES.inbox, icon: '◎' },
--  { label: 'In Progress', href: ROUTES.arena, icon: '▶' },
--  { label: 'Icebox', href: ROUTES.icebox, icon: '❄' },
--  { label: 'Shipped', href: ROUTES.shipped, icon: '✦' },
--  { label: 'Killed', href: ROUTES.killed, icon: '†' },
-+  { label: COPY.inbox.heading, href: ROUTES.inbox, icon: '◎' },
-+  { label: COPY.arena.heading, href: ROUTES.arena, icon: '▶' },
-+  { label: COPY.icebox.heading, href: ROUTES.icebox, icon: '❄' },
-+  { label: COPY.shipped.heading, href: ROUTES.shipped, icon: '✦' },
-+  { label: COPY.killed.heading, href: ROUTES.killed, icon: '†' },
- ]
- 
- export function StudioSidebar() {
-diff --git a/content/drill-principles.md b/content/drill-principles.md
-index bb7f250..b5208a2 100644
---- a/content/drill-principles.md
-+++ b/content/drill-principles.md
-@@ -1,6 +1,6 @@
--# Drill Principles
-+# Definition Flow
- 
--The Drill Tunnel forces clarity before commitment.
-+The definition flow shapes clarity before commitment.
- 
- ## The 6 questions
- 
-@@ -9,7 +9,7 @@ The Drill Tunnel forces clarity before commitment.
- 3. **Scope** — Small, Medium, or Large. Be honest.
- 4. **Execution path** — Solo, Assisted, or Delegated.
- 5. **Priority** — Now, Later, or Never.
--6. **Decision** — Arena, Icebox, or Remove. No limbo.
-+6. **Decision** — Start building, Put on hold, or Remove. No limbo.
- 
- ## Why this works
- 
-diff --git a/content/no-limbo.md b/content/no-limbo.md
-index aa8eadd..5302825 100644
---- a/content/no-limbo.md
-+++ b/content/no-limbo.md
-@@ -1,10 +1,10 @@
--# No Limbo
-+# Clear Decisions
- 
- The central rule of Mira: **no limbo**.
- 
- An idea is either:
--- **In play** (Arena)
--- **Frozen** (Icebox)
--- **Gone** (removed)
-+- **In progress**
-+- **On hold**
-+- **Removed**
- 
--There is no "maybe" shelf. The Icebox is not a maybe shelf — it has a timer. After 14 days, stale items prompt a decision.
-+There is no "maybe" shelf. The "On hold" list has a timer — after 14 days, stale items prompt a decision.
-diff --git a/content/onboarding.md b/content/onboarding.md
-index c3cd239..2d84044 100644
---- a/content/onboarding.md
-+++ b/content/onboarding.md
-@@ -4,12 +4,12 @@ Welcome to Mira Studio.
- 
- ## How it works
- 
--1. **Send** — Ideas arrive from the GPT via webhook or manual entry.
--2. **Drill** — You define the idea by answering 6 focused questions.
--3. **Arena** — Active projects (max 3) live here.
--4. **Icebox** — Deferred ideas and projects wait here.
--5. **Archive** — Shipped projects go to the Trophy Room. Removed ones go to the Graveyard.
-+1. **Captured** — Ideas arrive from GPT or the dev harness.
-+2. **Defined** — You shape the idea by answering 6 focused questions.
-+3. **In Progress** — Active projects (max 3) live here.
-+4. **On Hold** — Projects on pause wait here.
-+5. **Archive** — Completed projects are Shipped; others are Removed.
- 
- ## The rule
- 
--No limbo. Every idea is either in play, frozen, or gone.
-+Every idea gets a clear decision. No limbo.
-diff --git a/content/tone-guide.md b/content/tone-guide.md
-index 8f54e3a..32df6c2 100644
---- a/content/tone-guide.md
-+++ b/content/tone-guide.md
-@@ -11,7 +11,7 @@ Mira speaks with precision. No fluff.
- 
- ## Examples
- 
--Good: "Idea captured. Define it or let it go."
-+Good: "Idea captured. Decide what to do next."
- Bad: "Great news! Your idea has been saved to the system!"
- 
- Good: "No active projects. Define an idea to get started."
-diff --git a/lib/adapters/github-adapter.ts b/lib/adapters/github-adapter.ts
-index 94dd914..d865bd9 100644
---- a/lib/adapters/github-adapter.ts
-+++ b/lib/adapters/github-adapter.ts
-@@ -1,13 +1,14 @@
- import type { Task } from '@/types/task'
- import type { PullRequest } from '@/types/pr'
--import { MOCK_TASKS, MOCK_PRS } from '@/lib/mock-data'
-+import { getTasksForProject } from '@/lib/services/tasks-service'
-+import { getPRsForProject } from '@/lib/services/prs-service'
- 
- export async function fetchProjectTasks(projectId: string): Promise<Task[]> {
--  return MOCK_TASKS.filter((t) => t.projectId === projectId)
-+  return getTasksForProject(projectId)
- }
- 
- export async function fetchProjectPRs(projectId: string): Promise<PullRequest[]> {
--  return MOCK_PRS.filter((pr) => pr.projectId === projectId)
-+  return getPRsForProject(projectId)
- }
- 
- export async function mergePR(prId: string): Promise<boolean> {
-diff --git a/lib/adapters/notifications-adapter.ts b/lib/adapters/notifications-adapter.ts
-index 3283abf..333e18e 100644
---- a/lib/adapters/notifications-adapter.ts
-+++ b/lib/adapters/notifications-adapter.ts
-@@ -1,10 +1,10 @@
- import type { InboxEvent } from '@/types/inbox'
--import { MOCK_INBOX } from '@/lib/mock-data'
-+import { getInboxEvents, markRead } from '@/lib/services/inbox-service'
- 
- export async function fetchInboxEvents(): Promise<InboxEvent[]> {
--  return MOCK_INBOX
-+  return getInboxEvents()
- }
- 
- export async function markEventRead(eventId: string): Promise<void> {
--  console.log(`[notifications-adapter] markEventRead called for ${eventId}`)
-+  return markRead(eventId)
- }
-diff --git a/lib/adapters/vercel-adapter.ts b/lib/adapters/vercel-adapter.ts
-index a41074a..caac97e 100644
---- a/lib/adapters/vercel-adapter.ts
-+++ b/lib/adapters/vercel-adapter.ts
-@@ -1,7 +1,7 @@
--import { MOCK_PROJECTS } from '@/lib/mock-data'
-+import { getProjectById } from '@/lib/services/projects-service'
- 
- export async function fetchPreviewUrl(projectId: string): Promise<string | null> {
--  const project = MOCK_PROJECTS.find((p) => p.id === projectId)
-+  const project = await getProjectById(projectId)
-   return project?.activePreviewUrl ?? null
- }
- 
-diff --git a/lib/constants.ts b/lib/constants.ts
-index 04bdd22..a21a779 100644
---- a/lib/constants.ts
-+++ b/lib/constants.ts
-@@ -15,3 +15,6 @@ export const DRILL_STEPS = [
- ] as const
- 
- export type DrillStep = (typeof DRILL_STEPS)[number]
-+
-+export const STORAGE_DIR = '.local-data'
-+export const STORAGE_PATH = `${STORAGE_DIR}/studio.json`
-diff --git a/lib/formatters/inbox-formatters.ts b/lib/formatters/inbox-formatters.ts
-index a63f042..c9bf26c 100644
---- a/lib/formatters/inbox-formatters.ts
-+++ b/lib/formatters/inbox-formatters.ts
-@@ -12,6 +12,7 @@ export function formatEventType(type: InboxEvent['type']): string {
-     merge_completed: 'Merge completed',
-     project_shipped: 'Project shipped',
-     project_killed: 'Project killed',
-+    changes_requested: 'Changes requested',
-   }
-   return labels[type] ?? type
- }
-diff --git a/lib/mock-data.ts b/lib/mock-data.ts
-deleted file mode 100644
-index 0ed3183..0000000
---- a/lib/mock-data.ts
-+++ /dev/null
-@@ -1,200 +0,0 @@
--import type { Idea } from '@/types/idea'
--import type { Project } from '@/types/project'
--import type { Task } from '@/types/task'
--import type { PullRequest } from '@/types/pr'
--import type { InboxEvent } from '@/types/inbox'
--import type { DrillSession } from '@/types/drill'
--
--export const MOCK_IDEAS: Idea[] = [
--  {
--    id: 'idea-001',
--    title: 'AI-powered code review assistant',
--    rawPrompt: 'What if we had a tool that could automatically review PRs and suggest improvements based on team coding standards?',
--    gptSummary: 'A GitHub-integrated tool that analyzes pull requests against defined coding standards and provides actionable feedback.',
--    vibe: 'productivity',
--    audience: 'engineering teams',
--    intent: 'Reduce code review bottlenecks and maintain code quality at scale.',
--    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
--    status: 'captured',
--  },
--  {
--    id: 'idea-002',
--    title: 'Team onboarding checklist builder',
--    rawPrompt: 'Build something to help companies create interactive onboarding flows for new hires',
--    gptSummary: 'A tool for building structured, trackable onboarding checklists with progress visibility for managers and new hires.',
--    vibe: 'operations',
--    audience: 'HR teams and new employees',
--    intent: 'Cut onboarding time and reduce "what do I do next" anxiety.',
--    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
--    status: 'icebox',
--  },
--]
--
--export const MOCK_DRILL_SESSIONS: DrillSession[] = [
--  {
--    id: 'drill-001',
--    ideaId: 'idea-001',
--    successMetric: 'PR review time drops by 40% in first month',
--    scope: 'medium',
--    executionPath: 'assisted',
--    urgencyDecision: 'now',
--    finalDisposition: 'arena',
--    completedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
--  },
--]
--
--export const MOCK_PROJECTS: Project[] = [
--  {
--    id: 'proj-001',
--    ideaId: 'idea-003',
--    name: 'Mira Studio v1',
--    summary: 'The Vercel-hosted studio UI for managing ideas from capture to execution.',
--    state: 'arena',
--    health: 'green',
--    currentPhase: 'Core UI',
--    nextAction: 'Review open PRs',
--    activePreviewUrl: 'https://preview.vercel.app/mira-studio',
--    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
--    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
--  },
--  {
--    id: 'proj-002',
--    ideaId: 'idea-004',
--    name: 'Custom GPT Intake Layer',
--    summary: 'The ChatGPT custom action that sends structured idea payloads to Mira.',
--    state: 'arena',
--    health: 'yellow',
--    currentPhase: 'Integration',
--    nextAction: 'Fix webhook auth',
--    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
--    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
--  },
--  {
--    id: 'proj-003',
--    ideaId: 'idea-005',
--    name: 'Analytics Dashboard',
--    summary: 'Shipped product metrics for internal tracking.',
--    state: 'shipped',
--    health: 'green',
--    currentPhase: 'Shipped',
--    nextAction: '',
--    activePreviewUrl: 'https://analytics.example.com',
--    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
--    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
--    shippedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
--  },
--  {
--    id: 'proj-004',
--    ideaId: 'idea-006',
--    name: 'Mobile App v2',
--    summary: 'Complete rebuild of mobile experience.',
--    state: 'killed',
--    health: 'red',
--    currentPhase: 'Killed',
--    nextAction: '',
--    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
--    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
--    killedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
--    killedReason: 'Scope too large for current team. Web-first is the right call.',
--  },
--]
--
--export const MOCK_TASKS: Task[] = [
--  {
--    id: 'task-001',
--    projectId: 'proj-001',
--    title: 'Implement drill tunnel flow',
--    status: 'in_progress',
--    priority: 'high',
--    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
--  },
--  {
--    id: 'task-002',
--    projectId: 'proj-001',
--    title: 'Build arena project card',
--    status: 'done',
--    priority: 'high',
--    linkedPrId: 'pr-001',
--    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
--  },
--  {
--    id: 'task-003',
--    projectId: 'proj-001',
--    title: 'Wire API routes to mock data',
--    status: 'pending',
--    priority: 'medium',
--    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
--  },
--  {
--    id: 'task-004',
--    projectId: 'proj-002',
--    title: 'Fix webhook signature validation',
--    status: 'blocked',
--    priority: 'high',
--    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
--  },
--]
--
--export const MOCK_PRS: PullRequest[] = [
--  {
--    id: 'pr-001',
--    projectId: 'proj-001',
--    title: 'feat: arena project cards',
--    branch: 'feat/arena-cards',
--    status: 'merged',
--    previewUrl: 'https://preview.vercel.app/arena-cards',
--    buildState: 'success',
--    mergeable: true,
--    number: 12,
--    author: 'builder',
--    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
--  },
--  {
--    id: 'pr-002',
--    projectId: 'proj-001',
--    title: 'feat: drill tunnel components',
--    branch: 'feat/drill-tunnel',
--    status: 'open',
--    previewUrl: 'https://preview.vercel.app/drill-tunnel',
--    buildState: 'running',
--    mergeable: true,
--    number: 14,
--    author: 'builder',
--    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
--  },
--]
--
--export const MOCK_INBOX: InboxEvent[] = [
--  {
--    id: 'evt-001',
--    type: 'idea_captured',
--    title: 'New idea arrived',
--    body: 'AI-powered code review assistant — ready for drill.',
--    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
--    severity: 'info',
--    actionUrl: '/send',
--    read: false,
--  },
--  {
--    id: 'evt-002',
--    projectId: 'proj-001',
--    type: 'pr_opened',
--    title: 'PR opened: feat/drill-tunnel',
--    body: 'A new pull request is ready for review.',
--    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
--    severity: 'info',
--    actionUrl: '/review/pr-002',
--    read: false,
--  },
--  {
--    id: 'evt-003',
--    projectId: 'proj-002',
--    type: 'build_failed',
--    title: 'Build failed: Custom GPT Intake',
--    body: 'Webhook auth integration is failing. Action needed.',
--    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
--    severity: 'error',
--    actionUrl: '/arena/proj-002',
--    read: false,
--  },
--]
-diff --git a/lib/routes.ts b/lib/routes.ts
-index 1a0de13..c8067db 100644
---- a/lib/routes.ts
-+++ b/lib/routes.ts
-@@ -11,4 +11,5 @@ export const ROUTES = {
-   killed: '/killed',
-   review: (prId: string) => `/review/${prId}`,
-   inbox: '/inbox',
-+  devGptSend: '/dev/gpt-send',
- } as const
-diff --git a/lib/services/drill-service.ts b/lib/services/drill-service.ts
-index 6708178..922104a 100644
---- a/lib/services/drill-service.ts
-+++ b/lib/services/drill-service.ts
-@@ -1,19 +1,20 @@
- import type { DrillSession } from '@/types/drill'
--import { MOCK_DRILL_SESSIONS } from '@/lib/mock-data'
-+import { getCollection, saveCollection } from '@/lib/storage'
- import { generateId } from '@/lib/utils'
- 
--const sessions: DrillSession[] = [...MOCK_DRILL_SESSIONS]
--
- export function getDrillSessionByIdeaId(ideaId: string): DrillSession | undefined {
-+  const sessions = getCollection('drillSessions')
-   return sessions.find((s) => s.ideaId === ideaId)
- }
- 
- export function saveDrillSession(data: Omit<DrillSession, 'id'>): DrillSession {
-+  const sessions = getCollection('drillSessions')
-   const session: DrillSession = {
-     ...data,
-     id: `drill-${generateId()}`,
-     completedAt: data.completedAt ?? new Date().toISOString(),
-   }
-   sessions.push(session)
-+  saveCollection('drillSessions', sessions)
-   return session
- }
-diff --git a/lib/services/ideas-service.ts b/lib/services/ideas-service.ts
-index 76d1ff1..4d122f8 100644
---- a/lib/services/ideas-service.ts
-+++ b/lib/services/ideas-service.ts
-@@ -1,22 +1,23 @@
- import type { Idea, IdeaStatus } from '@/types/idea'
--import { MOCK_IDEAS } from '@/lib/mock-data'
-+import { getCollection, saveCollection } from '@/lib/storage'
- import { generateId } from '@/lib/utils'
- 
--const ideas: Idea[] = [...MOCK_IDEAS]
--
--export function getIdeas(): Idea[] {
--  return ideas
-+export async function getIdeas(): Promise<Idea[]> {
-+  return getCollection('ideas')
- }
- 
--export function getIdeaById(id: string): Idea | undefined {
-+export async function getIdeaById(id: string): Promise<Idea | undefined> {
-+  const ideas = await getIdeas()
-   return ideas.find((i) => i.id === id)
- }
- 
--export function getIdeasByStatus(status: IdeaStatus): Idea[] {
-+export async function getIdeasByStatus(status: IdeaStatus): Promise<Idea[]> {
-+  const ideas = await getIdeas()
-   return ideas.filter((i) => i.status === status)
- }
- 
--export function createIdea(data: Omit<Idea, 'id' | 'createdAt' | 'status'>): Idea {
-+export async function createIdea(data: Omit<Idea, 'id' | 'createdAt' | 'status'>): Promise<Idea> {
-+  const ideas = await getIdeas()
-   const idea: Idea = {
-     ...data,
-     id: `idea-${generateId()}`,
-@@ -24,12 +25,15 @@ export function createIdea(data: Omit<Idea, 'id' | 'createdAt' | 'status'>): Ide
-     status: 'captured',
-   }
-   ideas.push(idea)
-+  saveCollection('ideas', ideas)
-   return idea
- }
- 
--export function updateIdeaStatus(id: string, status: IdeaStatus): Idea | null {
-+export async function updateIdeaStatus(id: string, status: IdeaStatus): Promise<Idea | null> {
-+  const ideas = await getIdeas()
-   const idea = ideas.find((i) => i.id === id)
-   if (!idea) return null
-   idea.status = status
-+  saveCollection('ideas', ideas)
-   return idea
- }
-diff --git a/lib/services/inbox-service.ts b/lib/services/inbox-service.ts
-index 50a3cb7..9c6efef 100644
---- a/lib/services/inbox-service.ts
-+++ b/lib/services/inbox-service.ts
-@@ -1,10 +1,56 @@
--import type { InboxEvent } from '@/types/inbox'
--import { fetchInboxEvents, markEventRead } from '@/lib/adapters/notifications-adapter'
-+import type { InboxEvent, InboxEventType } from '@/types/inbox'
-+import { getCollection, saveCollection } from '@/lib/storage'
-+import { generateId } from '@/lib/utils'
- 
- export async function getInboxEvents(): Promise<InboxEvent[]> {
--  return fetchInboxEvents()
-+  return getCollection('inbox')
-+}
-+
-+export async function createInboxEvent(data: {
-+  type: InboxEventType
-+  title: string
-+  body: string
-+  severity: InboxEvent['severity']
-+  projectId?: string
-+  actionUrl?: string
-+  timestamp?: string
-+  read?: boolean
-+}): Promise<InboxEvent> {
-+  const inbox = await getInboxEvents()
-+  const event: InboxEvent = {
-+    ...data,
-+    id: `evt-${generateId()}`,
-+    timestamp: data.timestamp ?? new Date().toISOString(),
-+    read: data.read ?? false,
-+  }
-+  inbox.push(event)
-+  saveCollection('inbox', inbox)
-+  return event
- }
- 
- export async function markRead(eventId: string): Promise<void> {
--  return markEventRead(eventId)
-+  const inbox = await getInboxEvents()
-+  const event = inbox.find((e) => e.id === eventId)
-+  if (event) {
-+    event.read = true
-+    saveCollection('inbox', inbox)
-+  }
-+}
-+
-+export async function getUnreadCount(): Promise<number> {
-+  const inbox = await getInboxEvents()
-+  return inbox.filter((e) => !e.read).length
-+}
-+
-+export async function getEventsByFilter(filter: 'all' | 'unread' | 'errors'): Promise<InboxEvent[]> {
-+  const inbox = await getInboxEvents()
-+  switch (filter) {
-+    case 'unread':
-+      return inbox.filter((e) => !e.read)
-+    case 'errors':
-+      return inbox.filter((e) => e.severity === 'error')
-+    case 'all':
-+    default:
-+      return inbox
-+  }
- }
-diff --git a/lib/services/materialization-service.ts b/lib/services/materialization-service.ts
-index 764818e..f889114 100644
---- a/lib/services/materialization-service.ts
-+++ b/lib/services/materialization-service.ts
-@@ -3,9 +3,10 @@ import type { Project } from '@/types/project'
- import type { Idea } from '@/types/idea'
- import { createProject } from '@/lib/services/projects-service'
- import { updateIdeaStatus } from '@/lib/services/ideas-service'
-+import { createInboxEvent } from '@/lib/services/inbox-service'
- 
- export async function materializeIdea(idea: Idea, drill: DrillSession): Promise<Project> {
--  const project = createProject({
-+  const project = await createProject({
-     ideaId: idea.id,
-     name: idea.title,
-     summary: idea.gptSummary,
-@@ -16,7 +17,17 @@ export async function materializeIdea(idea: Idea, drill: DrillSession): Promise<
-     activePreviewUrl: undefined,
-   })
- 
--  updateIdeaStatus(idea.id, 'arena')
-+  await updateIdeaStatus(idea.id, 'arena')
-+
-+  // W4: Create inbox event to notify about project promotion
-+  await createInboxEvent({
-+    type: 'project_promoted',
-+    title: 'Project Promoted',
-+    body: `"${idea.title}" has been promoted to the Arena with scope: ${drill.scope}.`,
-+    severity: 'info',
-+    projectId: project.id,
-+    actionUrl: `/arena/${project.id}`,
-+  })
- 
-   return project
- }
-diff --git a/lib/services/projects-service.ts b/lib/services/projects-service.ts
-index 530cb56..2c6474c 100644
---- a/lib/services/projects-service.ts
-+++ b/lib/services/projects-service.ts
-@@ -1,31 +1,33 @@
- import type { Project, ProjectState } from '@/types/project'
--import { MOCK_PROJECTS } from '@/lib/mock-data'
-+import { getCollection, saveCollection } from '@/lib/storage'
- import { generateId } from '@/lib/utils'
- import { MAX_ARENA_PROJECTS } from '@/lib/constants'
- 
--const projects: Project[] = [...MOCK_PROJECTS]
--
--export function getProjects(): Project[] {
--  return projects
-+export async function getProjects(): Promise<Project[]> {
-+  return getCollection('projects')
- }
- 
--export function getProjectById(id: string): Project | undefined {
-+export async function getProjectById(id: string): Promise<Project | undefined> {
-+  const projects = await getProjects()
-   return projects.find((p) => p.id === id)
- }
- 
--export function getProjectsByState(state: ProjectState): Project[] {
-+export async function getProjectsByState(state: ProjectState): Promise<Project[]> {
-+  const projects = await getProjects()
-   return projects.filter((p) => p.state === state)
- }
- 
--export function getArenaProjects(): Project[] {
-+export async function getArenaProjects(): Promise<Project[]> {
-   return getProjectsByState('arena')
- }
- 
--export function isArenaAtCapacity(): boolean {
--  return getArenaProjects().length >= MAX_ARENA_PROJECTS
-+export async function isArenaAtCapacity(): Promise<boolean> {
-+  const arena = await getArenaProjects()
-+  return arena.length >= MAX_ARENA_PROJECTS
- }
- 
--export function createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
-+export async function createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
-+  const projects = await getProjects()
-   const project: Project = {
-     ...data,
-     id: `proj-${generateId()}`,
-@@ -33,14 +35,19 @@ export function createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedA
-     updatedAt: new Date().toISOString(),
-   }
-   projects.push(project)
-+  saveCollection('projects', projects)
-   return project
- }
- 
--export function updateProjectState(id: string, state: ProjectState, extra?: Partial<Project>): Project | null {
-+export async function updateProjectState(id: string, state: ProjectState, extra?: Partial<Project>): Promise<Project | null> {
-+  const projects = await getProjects()
-   const project = projects.find((p) => p.id === id)
-   if (!project) return null
-+  
-   project.state = state
-   project.updatedAt = new Date().toISOString()
-   if (extra) Object.assign(project, extra)
-+  
-+  saveCollection('projects', projects)
-   return project
- }
-diff --git a/lib/services/prs-service.ts b/lib/services/prs-service.ts
-index 47f4703..a8b76b5 100644
---- a/lib/services/prs-service.ts
-+++ b/lib/services/prs-service.ts
-@@ -1,11 +1,39 @@
- import type { PullRequest } from '@/types/pr'
--import { fetchProjectPRs } from '@/lib/adapters/github-adapter'
--import { MOCK_PRS } from '@/lib/mock-data'
-+import { getCollection, saveCollection } from '@/lib/storage'
-+import { generateId } from '@/lib/utils'
- 
- export async function getPRsForProject(projectId: string): Promise<PullRequest[]> {
--  return fetchProjectPRs(projectId)
-+  const prs = getCollection('prs')
-+  return prs.filter((pr) => pr.projectId === projectId)
- }
- 
- export async function getPRById(id: string): Promise<PullRequest | undefined> {
--  return MOCK_PRS.find((pr) => pr.id === id)
-+  const prs = getCollection('prs')
-+  return prs.find((pr) => pr.id === id)
-+}
-+
-+export async function createPR(data: Omit<PullRequest, 'id' | 'createdAt' | 'number'>): Promise<PullRequest> {
-+  const prs = getCollection('prs')
-+  const lastPr = prs[prs.length - 1]
-+  const nextNumber = lastPr ? lastPr.number + 1 : 1
-+  
-+  const pr: PullRequest = {
-+    ...data,
-+    id: `pr-${generateId()}`,
-+    number: nextNumber,
-+    createdAt: new Date().toISOString(),
-+  }
-+  prs.push(pr)
-+  saveCollection('prs', prs)
-+  return pr
-+}
-+
-+export async function updatePR(id: string, updates: Partial<PullRequest>): Promise<PullRequest | null> {
-+  const prs = getCollection('prs')
-+  const index = prs.findIndex((pr) => pr.id === id)
-+  if (index === -1) return null
-+  
-+  prs[index] = { ...prs[index], ...updates }
-+  saveCollection('prs', prs)
-+  return prs[index]
- }
-diff --git a/lib/services/tasks-service.ts b/lib/services/tasks-service.ts
-index 8debd1d..8879a55 100644
---- a/lib/services/tasks-service.ts
-+++ b/lib/services/tasks-service.ts
-@@ -1,6 +1,30 @@
- import type { Task } from '@/types/task'
--import { fetchProjectTasks } from '@/lib/adapters/github-adapter'
-+import { getCollection, saveCollection } from '@/lib/storage'
-+import { generateId } from '@/lib/utils'
- 
- export async function getTasksForProject(projectId: string): Promise<Task[]> {
--  return fetchProjectTasks(projectId)
-+  const tasks = getCollection('tasks')
-+  return tasks.filter((t) => t.projectId === projectId)
-+}
-+
-+export async function createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
-+  const tasks = getCollection('tasks')
-+  const task: Task = {
-+    ...data,
-+    id: `task-${generateId()}`,
-+    createdAt: new Date().toISOString(),
-+  }
-+  tasks.push(task)
-+  saveCollection('tasks', tasks)
-+  return task
-+}
-+
-+export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
-+  const tasks = getCollection('tasks')
-+  const index = tasks.findIndex((t) => t.id === id)
-+  if (index === -1) return null
-+  
-+  tasks[index] = { ...tasks[index], ...updates }
-+  saveCollection('tasks', tasks)
-+  return tasks[index]
- }
-diff --git a/lib/studio-copy.ts b/lib/studio-copy.ts
-index 4b63de4..9a1fe94 100644
---- a/lib/studio-copy.ts
-+++ b/lib/studio-copy.ts
-@@ -1,14 +1,25 @@
- export const COPY = {
-   app: {
-     name: 'Mira',
--    tagline: 'Chat is where ideas are born. Studio is where ideas are forced into truth.',
-+    tagline: 'Your ideas, shaped and shipped.',
-+  },
-+  home: {
-+    heading: 'Studio',
-+    subheading: 'Your attention cockpit.',
-+    sections: {
-+      attention: 'Needs attention',
-+      inProgress: 'In progress',
-+      activity: 'Recent activity',
-+    },
-+    attentionCaughtUp: "You're all caught up.",
-+    activitySeeAll: 'See all →',
-   },
-   send: {
--    heading: 'Idea captured.',
--    subheading: 'Define it or let it go.',
-+    heading: 'Ideas from GPT',
-+    subheading: 'Review what arrived and decide what to do next.',
-     ctaPrimary: 'Define in Studio',
--    ctaIcebox: 'Send to Icebox',
--    ctaKill: 'Kill it now',
-+    ctaIcebox: 'Put on hold',
-+    ctaKill: 'Remove',
-   },
-   drill: {
-     heading: "Let's define this.",
-@@ -36,40 +47,47 @@ export const COPY = {
-       },
-       decision: {
-         question: "What's the call?",
--        hint: 'Arena, Icebox, or Kill. No limbo.',
-+        hint: 'Commit, hold, or remove. Every idea gets a clear decision.',
-       },
-     },
-     cta: {
-       next: 'Next →',
-       back: '← Back',
--      commit: 'Commit to Arena',
--      icebox: 'Send to Icebox',
--      kill: 'Kill this idea',
-+      commit: 'Start building',
-+      icebox: 'Put on hold',
-+      kill: 'Remove this idea',
-     },
-   },
-   arena: {
-     heading: 'In Progress',
-     empty: 'No active projects. Define an idea to get started.',
--    limitReached: "You're at capacity. Ship or kill something first.",
-+    limitReached: "You're at capacity. Ship or remove something first.",
-     limitBanner: 'Active limit: {count}/{max}',
-   },
-   icebox: {
--    heading: 'Icebox',
--    empty: 'Nothing deferred. Ideas are either in play or gone.',
-+    heading: 'On Hold',
-+    subheading: 'Ideas and projects on pause',
-+    empty: 'Nothing on hold right now.',
-     staleWarning: 'This idea has been here for {days} days. Time to decide.',
-   },
-   shipped: {
--    heading: 'Trophy Room',
--    empty: 'Nothing shipped yet. Get one idea to the finish line.',
-+    heading: 'Shipped',
-+    empty: 'Nothing shipped yet.',
-   },
-   killed: {
--    heading: 'Graveyard',
--    empty: "Nothing killed. Good ideas die too — that's how focus works.",
--    resurrection: 'Resurrect',
-+    heading: 'Removed',
-+    empty: 'Nothing removed yet.',
-+    resurrection: 'Restore',
-   },
-   inbox: {
-     heading: 'Inbox',
-     empty: 'No new events.',
-+    filters: {
-+      all: 'All',
-+      unread: 'Unread',
-+      errors: 'Errors',
-+    },
-+    markRead: 'Mark as read',
-   },
-   common: {
-     loading: 'Working...',
-diff --git a/lib/validators/drill-validator.ts b/lib/validators/drill-validator.ts
-index 04943c6..a6d9c3b 100644
---- a/lib/validators/drill-validator.ts
-+++ b/lib/validators/drill-validator.ts
-@@ -1,12 +1,30 @@
- import type { DrillSession } from '@/types/drill'
- 
--export function validateDrillPayload(data: unknown): { valid: boolean; error?: string } {
-+export function validateDrillPayload(data: unknown): { valid: boolean; errors?: string[] } {
-   if (!data || typeof data !== 'object') {
--    return { valid: false, error: 'Invalid payload' }
-+    return { valid: false, errors: ['Invalid payload'] }
-   }
-   const d = data as Partial<DrillSession>
--  if (!d.ideaId) return { valid: false, error: 'ideaId is required' }
--  if (!d.successMetric) return { valid: false, error: 'successMetric is required' }
--  if (!d.finalDisposition) return { valid: false, error: 'finalDisposition is required' }
--  return { valid: true }
-+  const errors: string[] = []
-+
-+  if (!d.ideaId || typeof d.ideaId !== 'string') errors.push('ideaId is required and must be a string')
-+  if (!d.intent || typeof d.intent !== 'string') errors.push('intent is required and must be a string')
-+  if (!d.successMetric || typeof d.successMetric !== 'string') errors.push('successMetric is required and must be a string')
-+  
-+  const validScopes = ['small', 'medium', 'large']
-+  if (!d.scope || !validScopes.includes(d.scope)) errors.push('scope must be small, medium, or large')
-+
-+  const validPaths = ['solo', 'assisted', 'delegated']
-+  if (!d.executionPath || !validPaths.includes(d.executionPath)) errors.push('executionPath must be solo, assisted, or delegated')
-+
-+  const validUrgencies = ['now', 'later', 'never']
-+  if (!d.urgencyDecision || !validUrgencies.includes(d.urgencyDecision)) errors.push('urgencyDecision must be now, later, or never')
-+
-+  const validDispositions = ['arena', 'icebox', 'killed']
-+  if (!d.finalDisposition || !validDispositions.includes(d.finalDisposition)) errors.push('finalDisposition must be arena, icebox, or killed')
-+
-+  return {
-+    valid: errors.length === 0,
-+    errors: errors.length > 0 ? errors : undefined,
-+  }
- }
-diff --git a/lib/view-models/review-view-model.ts b/lib/view-models/review-view-model.ts
-index 5fcf2c7..86e5146 100644
---- a/lib/view-models/review-view-model.ts
-+++ b/lib/view-models/review-view-model.ts
-@@ -1,16 +1,28 @@
--import type { PullRequest } from '@/types/pr'
-+import type { PullRequest, ReviewStatus } from '@/types/pr'
- import type { Project } from '@/types/project'
- 
- export interface ReviewViewModel {
-   pr: PullRequest
-   project?: Project
-   canMerge: boolean
-+  reviewState: ReviewStatus
- }
- 
- export function buildReviewViewModel(pr: PullRequest, project?: Project): ReviewViewModel {
-+  let reviewState: ReviewStatus = 'pending'
-+
-+  if (pr.status === 'merged') {
-+    reviewState = 'merged'
-+  } else if (pr.reviewStatus) {
-+    reviewState = pr.reviewStatus
-+  } else if (pr.requestedChanges) {
-+    reviewState = 'changes_requested'
-+  }
-+
-   return {
-     pr,
-     project,
-     canMerge: pr.status === 'open' && pr.buildState === 'success' && pr.mergeable,
-+    reviewState,
-   }
- }
-diff --git a/package-lock.json b/package-lock.json
-index 04b58ed..360ad9d 100644
---- a/package-lock.json
-+++ b/package-lock.json
-@@ -561,6 +561,7 @@
-       "integrity": "sha512-z9VXpC7MWrhfWipitjNdgCauoMLRdIILQsAEV+ZesIzBq/oUlxk0m3ApZuMFCXdnS4U7KrI+l3WRUEGQ8K1QKw==",
-       "dev": true,
-       "license": "MIT",
-+      "peer": true,
-       "dependencies": {
-         "@types/prop-types": "*",
-         "csstype": "^3.2.2"
-@@ -621,6 +622,7 @@
-       "integrity": "sha512-k4eNDan0EIMTT/dUKc/g+rsJ6wcHYhNPdY19VoX/EOtaAG8DLtKCykhrUnuHPYvinn5jhAPgD2Qw9hXBwrahsw==",
-       "dev": true,
-       "license": "MIT",
-+      "peer": true,
-       "dependencies": {
-         "@typescript-eslint/scope-manager": "8.57.1",
-         "@typescript-eslint/types": "8.57.1",
-@@ -1140,6 +1142,7 @@
-       "integrity": "sha512-UVJyE9MttOsBQIDKw1skb9nAwQuR5wuGD3+82K6JgJlm/Y+KI92oNsMNGZCYdDsVtRHSak0pcV5Dno5+4jh9sw==",
-       "dev": true,
-       "license": "MIT",
-+      "peer": true,
-       "bin": {
-         "acorn": "bin/acorn"
-       },
-@@ -1572,6 +1575,7 @@
-         }
-       ],
-       "license": "MIT",
-+      "peer": true,
-       "dependencies": {
-         "baseline-browser-mapping": "^2.9.0",
-         "caniuse-lite": "^1.0.30001759",
-@@ -2213,6 +2217,7 @@
-       "deprecated": "This version is no longer supported. Please see https://eslint.org/version-support for other options.",
-       "dev": true,
-       "license": "MIT",
-+      "peer": true,
-       "dependencies": {
-         "@eslint-community/eslint-utils": "^4.2.0",
-         "@eslint-community/regexpp": "^4.6.1",
-@@ -2382,6 +2387,7 @@
-       "integrity": "sha512-whOE1HFo/qJDyX4SnXzP4N6zOWn79WhnCUY/iDR0mPfQZO8wcYE4JClzI2oZrhBnnMUCBCHZhO6VQyoBU95mZA==",
-       "dev": true,
-       "license": "MIT",
-+      "peer": true,
-       "dependencies": {
-         "@rtsao/scc": "^1.1.0",
-         "array-includes": "^3.1.9",
-@@ -3755,6 +3761,7 @@
-       "integrity": "sha512-/imKNG4EbWNrVjoNC/1H5/9GFy+tqjGBHCaSsN+P2RnPqjsLmv6UD3Ej+Kj8nBWaRAwyk7kK5ZUc+OEatnTR3A==",
-       "dev": true,
-       "license": "MIT",
-+      "peer": true,
-       "bin": {
-         "jiti": "bin/jiti.js"
-       }
-@@ -4533,6 +4540,7 @@
-         }
-       ],
-       "license": "MIT",
-+      "peer": true,
-       "dependencies": {
-         "nanoid": "^3.3.11",
-         "picocolors": "^1.1.1",
-@@ -4734,6 +4742,7 @@
-       "resolved": "https://registry.npmjs.org/react/-/react-18.3.1.tgz",
-       "integrity": "sha512-wS+hAgJShR0KhEvPJArfuPVN1+Hz1t0Y6n5jLrGQbkb4urgPE/0Rve+1kMB1v/oWgHgm4WIcV+i7F2pTVj+2iQ==",
-       "license": "MIT",
-+      "peer": true,
-       "dependencies": {
-         "loose-envify": "^1.1.0"
-       },
-@@ -4746,6 +4755,7 @@
-       "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-18.3.1.tgz",
-       "integrity": "sha512-5m4nQKp+rZRb09LNH59GM4BxTh9251/ylbKIbpe7TpGxfJ+9kv6BLkLBXIjjspbgbnIBNqlI23tRnTWT0snUIw==",
-       "license": "MIT",
-+      "peer": true,
-       "dependencies": {
-         "loose-envify": "^1.1.0",
-         "scheduler": "^0.23.2"
-@@ -5633,6 +5643,7 @@
-       "integrity": "sha512-5gTmgEY/sqK6gFXLIsQNH19lWb4ebPDLA4SdLP7dsWkIXHWlG66oPuVvXSGFPppYZz8ZDZq0dYYrbHfBCVUb1Q==",
-       "dev": true,
-       "license": "MIT",
-+      "peer": true,
-       "engines": {
-         "node": ">=12"
-       },
-@@ -5802,6 +5813,7 @@
-       "integrity": "sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==",
-       "dev": true,
-       "license": "Apache-2.0",
-+      "peer": true,
-       "bin": {
-         "tsc": "bin/tsc",
-         "tsserver": "bin/tsserver"
-diff --git a/package.json b/package.json
-index f29a10d..ff80cee 100644
---- a/package.json
-+++ b/package.json
-@@ -2,6 +2,7 @@
-   "name": "mira-studio",
-   "version": "0.1.0",
-   "private": true,
-+  "description": "Your ideas, shaped and shipped.",
-   "scripts": {
-     "dev": "next dev",
-     "build": "next build",
-diff --git a/types/drill.ts b/types/drill.ts
-index cd5dedc..de09fd1 100644
---- a/types/drill.ts
-+++ b/types/drill.ts
-@@ -3,6 +3,7 @@ export type DrillDisposition = 'arena' | 'icebox' | 'killed'
- export interface DrillSession {
-   id: string
-   ideaId: string
-+  intent: string
-   successMetric: string
-   scope: 'small' | 'medium' | 'large'
-   executionPath: 'solo' | 'assisted' | 'delegated'
-diff --git a/types/inbox.ts b/types/inbox.ts
-index c202c84..785b500 100644
---- a/types/inbox.ts
-+++ b/types/inbox.ts
-@@ -9,6 +9,7 @@ export type InboxEventType =
-   | 'merge_completed'
-   | 'project_shipped'
-   | 'project_killed'
-+  | 'changes_requested'
- 
- export interface InboxEvent {
-   id: string
-diff --git a/types/pr.ts b/types/pr.ts
-index e6d2f44..e754b7f 100644
---- a/types/pr.ts
-+++ b/types/pr.ts
-@@ -1,5 +1,6 @@
- export type PRStatus = 'open' | 'merged' | 'closed'
- export type BuildState = 'pending' | 'running' | 'success' | 'failed'
-+export type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'merged'
- 
- export interface PullRequest {
-   id: string
-@@ -11,6 +12,7 @@ export interface PullRequest {
-   buildState: BuildState
-   mergeable: boolean
-   requestedChanges?: string
-+  reviewStatus?: ReviewStatus
-   number: number
-   author: string
-   createdAt: string
-```
-
-### New Untracked Files
-
-#### `agents.md`
-
-```
-# Mira Studio — Agent Context
-
-> Standing context for any agent entering this repo. Not sprint-specific.
-
----
-
-## Product Summary
-
-Mira is a Vercel-hosted Studio UI for managing ideas from capture through execution. Ideas arrive from a custom GPT via webhook (or locally via a dev harness), then flow through a clarification tunnel (Drill), become projects, get reviewed via PR previews, and are ultimately shipped or archived.
-
-**Core user journey:** Capture → Clarify → Build → Review → Ship/Archive
-
-**Local development model:** The user is the local dev. They brainstorm ideas locally in the app and test the full flow. The API endpoints are the same contract that a custom GPT will hit in production. In local mode, ideas are entered via a `/dev/gpt-send` harness page. PRs and previews are simulated with local records.
-
----
-
-## Tech Stack
-
-| Layer | Tech |
-|-------|------|
-| Framework | Next.js 14.2 (App Router) |
-| Language | TypeScript (strict) |
-| Styling | Tailwind CSS 3.4, dark studio theme |
-| Data | JSON file storage under `.local-data/` (survives server restarts) |
-| State logic | `lib/state-machine.ts` — idea + project transition tables |
-| Copy/Labels | `lib/studio-copy.ts` — centralized UI copy |
-| Routing | `lib/routes.ts` — centralized route map |
-
----
-
-## Repo File Map
-
-```
-app/
-  page.tsx              ← Home / dashboard (attention cockpit)
-  layout.tsx            ← Root layout (html, body, globals.css)
-  globals.css           ← CSS custom props + tailwind directives
-  send/page.tsx         ← Incoming ideas from GPT (shows all captured ideas)
-  drill/page.tsx        ← 6-step idea clarification tunnel (client component)
-  drill/success/        ← Post-drill success screen
-  drill/end/            ← Post-drill kill screen
-  arena/page.tsx        ← Active projects list
-  arena/[projectId]/    ← Single project detail (3-pane)
-  review/[prId]/page.tsx← PR review page (preview-first)
-  inbox/page.tsx        ← Events feed (filterable, mark-read)
-  icebox/page.tsx       ← Deferred ideas + projects
-  shipped/page.tsx      ← Completed projects
-  killed/page.tsx       ← Removed projects
-  dev/
-    gpt-send/page.tsx   ← Dev harness: simulate GPT sending an idea
-  api/
-    ideas/route.ts       ← GET/POST ideas
-    ideas/materialize/   ← POST convert idea→project
-    drill/route.ts       ← POST save drill session
-    projects/route.ts    ← GET projects
-    tasks/route.ts       ← GET tasks by project
-    prs/route.ts         ← GET/PATCH PRs by project
-    inbox/route.ts       ← GET/PATCH inbox events
-    actions/
-      promote-to-arena/  ← POST
-      move-to-icebox/    ← POST
-      mark-shipped/      ← POST
-      kill-idea/         ← POST
-      merge-pr/          ← POST
-    webhook/
-      gpt/route.ts       ← GPT webhook receiver (used by dev harness locally)
-      github/route.ts    ← GitHub webhook receiver (stub)
-      vercel/route.ts    ← Vercel webhook receiver (stub)
-
-components/
-  shell/                 ← AppShell, StudioSidebar, StudioHeader, MobileNav, CommandBar
-  common/                ← EmptyState, StatusBadge, TimePill, ConfirmDialog, etc.
-  send/                  ← CapturedIdeaCard, DefineInStudioHero, IdeaSummaryPanel
-  drill/                 ← DrillLayout, DrillProgress, GiantChoiceButton, MaterializationSequence
-  arena/                 ← ArenaProjectCard, ActiveLimitBanner, PreviewFrame, ProjectPanes, etc.
-  review/                ← SplitReviewLayout, PRSummaryCard, DiffSummary, BuildStatusChip, FixRequestBox, PreviewToolbar
-  inbox/                 ← InboxFeed, InboxEventCard, InboxFilterTabs
-  icebox/                ← IceboxCard, StaleIdeaModal, TriageActions
-  archive/               ← TrophyCard, GraveyardCard, ArchiveFilterBar
-  dev/                   ← GPT send form, dev tools
-
-lib/
-  storage.ts             ← JSON file read/write for .local-data/
-  seed-data.ts           ← Initial seed records (replaces mock-data.ts)
-  state-machine.ts       ← Idea + project transition rules
-  studio-copy.ts         ← Central copy strings for all pages
-  constants.ts           ← MAX_ARENA_PROJECTS, DRILL_STEPS, enums, storage paths
-  routes.ts              ← Centralized route paths
-  guards.ts              ← Type guards
-  utils.ts               ← generateId helper
-  date.ts                ← Date formatting
-  services/              ← ideas, projects, tasks, prs, inbox, drill, materialization services
-  adapters/              ← github, gpt, vercel, notifications adapters (stubs)
-  formatters/            ← idea, project, pr, inbox formatters
-  validators/            ← idea, project, drill, webhook validators
-  view-models/           ← arena, icebox, inbox, review VMs
-
-types/
-  idea.ts, project.ts, task.ts, pr.ts, drill.ts, inbox.ts, webhook.ts, api.ts
-
-content/                 ← Product copy markdown
-docs/                    ← Architecture docs
-
-.local-data/             ← JSON file persistence (gitignored, auto-seeded)
-lanes/                   ← Sprint lane files (sprint-specific)
-```
-
----
-
-## Commands
-
-```bash
-npm install          # install dependencies
-npm run dev          # start dev server (next dev)
-npm run build        # production build (next build)
-npm run lint         # eslint
-npx tsc --noEmit     # type check
-```
-
----
-
-## Common Pitfalls
-
-### Data persistence is JSON-file based
-All services read/write through `lib/storage.ts` to `.local-data/studio.json`. Data survives server restarts. If the file doesn't exist, it auto-seeds from `lib/seed-data.ts`. **Do not** import mock arrays directly — always go through service functions.
-
-### Drill page is a client component
-`app/drill/page.tsx` is `'use client'`. It must use `fetch()` to call API routes. It cannot import server-side services directly.
-
-### All data mutations must go through API routes
-Client components call `/api/*` endpoints. Server components can import services directly. This ensures the same contract works for both the UI and the future custom GPT.
-
-### Review merge button must call the API
-The "Merge PR" button in `review/[prId]/page.tsx` must POST to `/api/actions/merge-pr`. Never mutate state directly from the component.
-
-### Webhook routes are stubs (except GPT)
-The GitHub and Vercel webhook handlers are stubs. The GPT webhook route is lightly functional — the local dev harness POSTs to it to simulate idea capture.
-
-### `studio-copy.ts` is the single source for UI labels
-All user-facing text should come from this file. Some pages still hardcode strings — fix them when you see them.
-
-### Route naming vs. internal naming
-Code uses "arena" / "icebox" / "killed" / "shipped" internally. The UI should present these in friendlier terms: "In Progress" / "On Hold" / "Removed" / "Shipped".
-
----
-
-## SOPs
-
-### SOP-1: Always use `lib/routes.ts` for navigation
-**Learned from**: Initial scaffolding
-
-- ❌ `href="/arena"` (hardcoded)
-- ✅ `href={ROUTES.arena}` (centralized)
-
-### SOP-2: All UI copy goes through `lib/studio-copy.ts`
-**Learned from**: Sprint 1 UX audit
-
-- ❌ `<h1>Trophy Room</h1>` (inline string)
-- ✅ `<h1>{COPY.shipped.heading}</h1>` (centralized copy)
-
-### SOP-3: State transitions go through `lib/state-machine.ts`
-**Learned from**: Initial architecture
-
-- ❌ Manually setting `idea.status = 'arena'` in a page
-- ✅ Use `getNextIdeaState(idea.status, 'commit_to_arena')` to validate transition
-
-### SOP-4: Never push/pull from git
-**Learned from**: Multi-agent coordination
-
-- ❌ `git push`, `git pull`, `git merge`
-- ✅ Only modify files. Coordinator handles version control.
-
-### SOP-5: All data mutations go through API routes
-**Learned from**: GPT contract compatibility
-
-- ❌ Calling `updateIdeaStatus()` directly from a client component
-- ✅ `fetch('/api/actions/kill-idea', { method: 'POST', body: ... })`
-- Why: The custom GPT will hit the same `/api/*` endpoints. The UI must exercise the same contract.
-
-### SOP-6: Use `lib/storage.ts` for all persistence
-**Learned from**: In-memory data loss on server restart
-
-- ❌ `const ideas: Idea[] = [...MOCK_IDEAS]` (module-level array, lost on restart)
-- ✅ `const ideas = storage.read('ideas')` (reads from `.local-data/studio.json`)
-- Why: Local data must survive server restarts. JSON file storage is the local persistence layer.
-
----
-
-## Lessons Learned (Changelog)
-
-- **2026-03-22**: Initial agents.md created during Sprint 1 boardinit.
-- **2026-03-22**: Added SOP-5 (API-first mutations) and SOP-6 (JSON file storage).
-```
-
-#### `app/dev/gpt-send/page.tsx`
-
-```
-import { AppShell } from '@/components/shell/app-shell'
-import { GPTIdeaForm } from '@/components/dev/gpt-idea-form'
-import Link from 'next/link'
-import { ROUTES } from '@/lib/routes'
-
-export default function GPTSendPage() {
-  return (
-    <AppShell>
-      <div className="max-w-2xl mx-auto space-y-10 py-10">
-        <div>
-          <div className="flex items-center gap-2 mb-4">
-            <Link href={ROUTES.home} className="text-[#4a4a6a] hover:text-[#e2e8f0] transition-colors text-sm">
-              ← Back to Studio
-            </Link>
-          </div>
-          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">Dev Harness: GPT Idea Capture</h1>
-          <p className="text-[#64748b] text-sm leading-relaxed">
-            Use this page to simulate an idea arriving from your custom GPT. It will POST to 
-            <code className="mx-1 px-1.5 py-0.5 bg-[#12121a] text-indigo-400 rounded text-xs select-all">/api/webhook/gpt</code> 
-            using the production contract, including data validation and inbox notification.
-          </p>
-        </div>
-
-        <div className="p-8 bg-[#0d0d18] border border-[#1e1e2e] rounded-2xl shadow-2xl">
-          <GPTIdeaForm />
-        </div>
-
-        <div className="text-center">
-          <p className="text-[#4a4a6a] text-xs">
-            The data sent here is persisted exactly like a real GPT submission.
-          </p>
-        </div>
-      </div>
-    </AppShell>
-  )
-}
-```
-
-#### `board.md`
-
-```
-# Mira Studio — Sprint Board
-
-## Sprint History
-
-| Sprint | Focus | Tests | Status |
-|--------|-------|-------|--------|
-| (none) | — | — | — |
-
----
-
-## Sprint 1 — Make It Real (Local-First)
-
-> Make the app behave like the future product with local persistence, fake GPT sends, and fake PR/preview records. Build one believable end-to-end loop: capture → drill → materialize → review → merge → inbox.
-
-### Dependency Graph
-
-```
-Lane 1 (Persistence):       [W1] → [W2] → [W3] → [W4] → [W5] → [W6]  ← FOUNDATION
-Lane 2 (Drill + Materialize):[W1] → [W2] → [W3] → [W4] → [W5] → [W6]
-Lane 3 (Send + Home):       [W1] → [W2] → [W3] → [W4] → [W5] → [W6]
-Lane 4 (Review + Merge):    [W1] → [W2] → [W3] → [W4] → [W5] → [W6]
-Lane 5 (Copy + Inbox + Dev):[W1] → [W2] → [W3] → [W4] → [W5] → [W6]
-                  ↓ all five complete ↓
-Lane 6 (Visual QA + Polish): [W1] → [W2] → [W3] → [W4] → [W5] → [W6]
-```
-
-**Lanes 1–5 are fully parallel** — zero file conflicts between them.
-**Lane 6 runs AFTER** Lanes 1–5 are merged. Lane 6 is the only lane that uses the browser.
-
----
-
-### Sprint 1 Ownership Zones
-
-| Zone | Files | Lane |
-|------|-------|------|
-| Storage engine + core services | `lib/storage.ts` (new), `lib/seed-data.ts` (renamed from mock-data.ts), `lib/services/ideas-service.ts`, `lib/services/projects-service.ts`, `lib/services/tasks-service.ts`, `lib/services/prs-service.ts`, `lib/services/inbox-service.ts`, `lib/constants.ts`, `lib/mock-data.ts` (delete/rename), `.gitignore` | Lane 1 |
-| Drill + materialization | `app/drill/page.tsx`, `app/drill/success/`, `app/drill/end/`, `app/api/drill/route.ts`, `app/api/ideas/materialize/route.ts`, `lib/services/drill-service.ts`, `lib/services/materialization-service.ts`, `types/drill.ts`, `lib/validators/drill-validator.ts`, `components/drill/*` | Lane 2 |
-| Send + Home + triage actions | `app/page.tsx`, `app/send/page.tsx`, `components/send/*`, `app/api/ideas/route.ts`, `components/common/empty-state.tsx`, `lib/view-models/arena-view-model.ts`, `app/api/actions/promote-to-arena/route.ts`, `app/api/actions/move-to-icebox/route.ts`, `app/api/actions/mark-shipped/route.ts`, `app/api/actions/kill-idea/route.ts` | Lane 3 |
-| Review + merge + fake PRs | `app/review/[prId]/page.tsx`, `app/arena/page.tsx`, `app/arena/[projectId]/page.tsx`, `components/review/*`, `components/arena/*`, `app/api/actions/merge-pr/route.ts`, `app/api/prs/route.ts`, `lib/view-models/review-view-model.ts` | Lane 4 |
-| Copy + inbox + dev harness | `lib/studio-copy.ts`, `lib/routes.ts`, `app/shipped/page.tsx`, `app/killed/page.tsx`, `app/icebox/page.tsx`, `app/inbox/page.tsx`, `app/layout.tsx`, `app/globals.css`, `content/*`, `README.md`, `components/shell/*`, `components/archive/*`, `components/icebox/*`, `components/inbox/*`, `components/dev/*` (new), `app/dev/gpt-send/page.tsx` (new), `app/api/webhook/gpt/route.ts`, `lib/view-models/inbox-view-model.ts`, `lib/adapters/*`, `package.json` | Lane 5 |
-| Visual QA + final polish | All files (read-only audit + targeted fixes) | Lane 6 |
-
----
-
-### Lane Status
-
-| Lane | Focus | File | Status |
-|------|-------|------|--------|
-| 🔴 Lane 1 | Local Persistence Engine | `lanes/lane-1-persistence.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
-| 🟢 Lane 2 | Drill & Materialization | `lanes/lane-2-drill.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
-| 🔵 Lane 3 | Send & Home Cockpit | `lanes/lane-3-send-home.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
-| 🟡 Lane 4 | Review & Merge Experience | `lanes/lane-4-review.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
-| 🟣 Lane 5 | Copy, Inbox & Dev Harness | `lanes/lane-5-copy-inbox-harness.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
-| 🏁 Lane 6 | Visual QA & Final Polish | `lanes/lane-6-visual-qa.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ W6 ⬜ |
-
----
-
-## Pre-Flight Checklist
-
-- [ ] `npm install` succeeds
-- [ ] `npx tsc --noEmit` passes
-- [ ] `npm run build` passes
-- [ ] Dev server starts (`npm run dev`)
-
-## Handoff Protocol
-
-1. Mark W items ⬜→🟡→✅ as you go
-2. Run `npx tsc --noEmit` before marking ✅ on your final W item
-3. **DO NOT open the browser or perform visual checks** in Lanes 1–5. Lane 6 handles all visual QA.
-4. Never touch files owned by other lanes (see Ownership Zones above)
-5. Never push/pull from git
-
-## Test Summary
-
-| Lane | TSC | Build | Notes |
-|------|-----|-------|-------|
-| Lane 1 | ✅ | ✅ | Persistence Engine: [PASS] (JSON storage verified with tsc + build) |
-| Lane 2 | ✅ | ✅ | W1-W6 done, storage-ready, materialization wired. |
-| Lane 3 | ✅ | ✅ | All Lane 3 files clean; `npx tsc --noEmit` passes (exit 0); `npm run build` passes (exit 0) |
-| Lane 4 | ✅ | ✅ | Preview-dominant review page, real iframe PreviewFrame, wired Merge + Approve buttons, FixRequestBox persists, plain-language pane labels, reviewState VM. |
-| Lane 5 | ✅ | ✅ | Fixed all Lane 5 files; global build now passing after Lane 1 fixes. |
-| Lane 6 | ⬜ | ⬜ | |
-```
-
-#### `components/common/next-action-badge.tsx`
-
-```
-import Link from 'next/link'
-
-interface NextActionBadgeProps {
-  label: string
-  href?: string
-  variant?: 'default' | 'warning' | 'error' | 'success'
-}
-
-const variantStyles = {
-  default: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
-  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
-  error: 'text-red-400 bg-red-500/10 border-red-500/20',
-  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
-}
-
-export function NextActionBadge({ label, href, variant = 'default' }: NextActionBadgeProps) {
-  const classes = `inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-full transition-opacity hover:opacity-80 ${variantStyles[variant]}`
-
-  if (href) {
-    return (
-      <Link href={href} className={classes}>
-        {label}
-      </Link>
-    )
-  }
-
-  return <span className={classes}>{label}</span>
-}
-```
-
-#### `components/dev/gpt-idea-form.tsx`
-
-```
-'use client'
-
-import { useState } from 'react'
-import { useRouter } from 'next/navigation'
-import { ROUTES } from '@/lib/routes'
-
-export function GPTIdeaForm() {
-  const router = useRouter()
-  const [loading, setLoading] = useState(false)
-  const [success, setSuccess] = useState(false)
-  const [error, setError] = useState(null as string | null)
-
-  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
-    e.preventDefault()
-    setLoading(true)
-    setError(null)
-
-    const formData = new FormData(e.currentTarget)
-    const payload = {
-      event: 'idea_captured',
-      data: {
-        title: formData.get('title'),
-        summary: formData.get('summary'),
-        body: formData.get('body'),
-        metadata: {
-          gpt_thread_id: `thread_${Math.random().toString(36).slice(2)}`,
-        },
-      },
-      timestamp: new Date().toISOString(),
-    }
-
-    try {
-      const res = await fetch('/api/webhook/gpt', {
-        method: 'POST',
-        headers: { 'Content-Type': 'application/json' },
-        body: JSON.stringify(payload),
-      })
-
-      if (!res.ok) {
-        const data = await res.json()
-        throw new Error(data.error || 'Failed to send')
-      }
-
-      setSuccess(true)
-      setTimeout(() => {
-        router.push(ROUTES.send)
-      }, 1500)
-    } catch (err: any) {
-      setError(err.message)
-    } finally {
-      setLoading(false)
-    }
-  }
-
-  if (success) {
-    return (
-      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 text-center">
-        <div className="text-emerald-400 text-4xl mb-4">✓</div>
-        <h3 className="text-[#e2e8f0] font-semibold mb-2">Idea Sent!</h3>
-        <p className="text-[#94a3b8] text-sm">Redirecting to capture list...</p>
-      </div>
-    )
-  }
-
-  return (
-    <form onSubmit={handleSubmit} className="space-y-6">
-      {error && (
-        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
-          {error}
-        </div>
-      )}
-
-      <div>
-        <label htmlFor="title" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
-          Idea Title
-        </label>
-        <input
-          required
-          id="title"
-          name="title"
-          placeholder="e.g., Personal CRM for Solopreneurs"
-          className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors"
-        />
-      </div>
-
-      <div>
-        <label htmlFor="summary" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
-          GPT Summary (One-liner)
-        </label>
-        <input
-          required
-          id="summary"
-          name="summary"
-          placeholder="A short, catchy summary of the idea."
-          className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors"
-        />
-      </div>
-
-      <div>
-        <label htmlFor="body" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
-          Full Context (Markdown)
-        </label>
-        <textarea
-          required
-          id="body"
-          name="body"
-          rows={10}
-          placeholder="Paste the full GPT context here..."
-          className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors font-mono text-sm"
-        />
-      </div>
-
-      <button
-        disabled={loading}
-        type="submit"
-        className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(99,102,241,0.2)]"
-      >
-        {loading ? 'Sending...' : 'Simulate GPT Send'}
-      </button>
-    </form>
-  )
-}
-```
-
-#### `components/drill/idea-context-card.tsx`
-
-```
-'use client'
-
-import type { Idea } from '@/types/idea'
-
-interface IdeaContextCardProps {
-  idea: Idea
-}
-
-export function IdeaContextCard({ idea }: IdeaContextCardProps) {
-  return (
-    <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
-      <div className="flex items-center gap-2 mb-4">
-        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest rounded border border-indigo-500/20">
-          Source: GPT
-        </span>
-        <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/20 to-transparent" />
-      </div>
-
-      <div className="bg-[#12121a]/40 border border-[#1e1e2e] rounded-2xl p-6 backdrop-blur-sm">
-        <h3 className="text-xl font-bold text-[#f8fafc] mb-3">{idea.title}</h3>
-        
-        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
-          <div>
-            <h4 className="text-[10px] font-bold text-[#4b5563] uppercase tracking-wider mb-2">Original Brainstorm</h4>
-            <p className="text-[#94a3b8] text-sm italic line-clamp-3">"{idea.rawPrompt}"</p>
-          </div>
-          <div>
-            <h4 className="text-[10px] font-bold text-[#4b5563] uppercase tracking-wider mb-2">GPT Summary</h4>
-            <p className="text-[#94a3b8] text-sm leading-relaxed">{idea.gptSummary}</p>
-          </div>
-        </div>
-
-        <div className="mt-6 pt-6 border-t border-[#1e1e2e] flex flex-wrap gap-2">
-          {idea.vibe && (
-            <span className="px-3 py-1 bg-amber-500/5 text-amber-400/80 text-xs rounded-full border border-amber-500/10">
-              Vibe: {idea.vibe}
-            </span>
-          )}
-          {idea.audience && (
-            <span className="px-3 py-1 bg-emerald-500/5 text-emerald-400/80 text-xs rounded-full border border-emerald-500/10">
-              For: {idea.audience}
-            </span>
-          )}
-        </div>
-      </div>
-    </div>
-  )
-}
-```
-
-#### `components/review/merge-actions.tsx`
-
-```
-'use client'
-
-import { useState } from 'react'
-import type { ReviewStatus } from '@/types/pr'
-
-interface MergeActionsProps {
-  prId: string
-  canMerge: boolean
-  currentStatus: string
-  reviewState: ReviewStatus
-}
-
-export function MergeActions({ prId, canMerge, currentStatus, reviewState }: MergeActionsProps) {
-  const [merging, setMerging] = useState(false)
-  const [approving, setApproving] = useState(false)
-  const [localReviewState, setLocalReviewState] = useState<ReviewStatus>(reviewState)
-  const [mergeError, setMergeError] = useState<string | null>(null)
-  const [merged, setMerged] = useState(currentStatus === 'merged')
-
-  const reviewStateLabels: Record<ReviewStatus, { label: string; color: string }> = {
-    pending: { label: 'Pending Review', color: 'text-[#94a3b8]' },
-    approved: { label: 'Approved', color: 'text-emerald-400' },
-    changes_requested: { label: 'Changes Requested', color: 'text-amber-400' },
-    merged: { label: 'Merged', color: 'text-indigo-400' },
-  }
-
-  const stateInfo = reviewStateLabels[merged ? 'merged' : localReviewState]
-
-  async function handleApprove() {
-    if (approving || localReviewState === 'approved') return
-    setApproving(true)
-    try {
-      const res = await fetch('/api/prs', {
-        method: 'PATCH',
-        headers: { 'Content-Type': 'application/json' },
-        body: JSON.stringify({ prId, reviewStatus: 'approved' }),
-      })
-      if (res.ok) {
-        setLocalReviewState('approved')
-      }
-    } catch {
-      // silently fail — local dev
-    } finally {
-      setApproving(false)
-    }
-  }
-
-  async function handleMerge() {
-    if (!canMerge || merging || merged) return
-    setMerging(true)
-    setMergeError(null)
-    try {
-      const res = await fetch('/api/actions/merge-pr', {
-        method: 'POST',
-        headers: { 'Content-Type': 'application/json' },
-        body: JSON.stringify({ prId }),
-      })
-      const json = await res.json()
-      if (!res.ok) {
-        setMergeError(json.error ?? 'Merge failed')
-      } else {
-        setMerged(true)
-        setLocalReviewState('merged')
-      }
-    } catch {
-      setMergeError('Network error. Please try again.')
-    } finally {
-      setMerging(false)
-    }
-  }
-
-  return (
-    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 space-y-4">
-      {/* Review status indicator */}
-      <div>
-        <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-2">Review Status</p>
-        <span className={`text-sm font-medium ${stateInfo.color}`}>
-          {stateInfo.label}
-        </span>
-      </div>
-
-      <div className="space-y-2">
-        {/* Approve button */}
-        {!merged && (
-          <button
-            onClick={handleApprove}
-            disabled={approving || localReviewState === 'approved'}
-            className="w-full px-4 py-2.5 text-sm font-medium bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
-          >
-            {approving ? 'Approving…' : localReviewState === 'approved' ? 'Approved ✓' : 'Approve'}
-          </button>
-        )}
-
-        {/* Merge button */}
-        <button
-          onClick={handleMerge}
-          disabled={!canMerge || merging || merged}
-          className="w-full px-4 py-2.5 text-sm font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
-        >
-          {merging ? 'Merging…' : merged ? 'Merged ✓' : 'Merge PR'}
-        </button>
-
-        {mergeError && (
-          <p className="text-xs text-red-400 mt-1">{mergeError}</p>
-        )}
-      </div>
-    </div>
-  )
-}
-```
-
-#### `components/send/send-page-client.tsx`
-
-```
-'use client'
-
-import { useState } from 'react'
-import { useRouter } from 'next/navigation'
-import type { Idea } from '@/types/idea'
-import { CapturedIdeaCard } from '@/components/send/captured-idea-card'
-import { ConfirmDialog } from '@/components/common/confirm-dialog'
-
-interface SendPageClientProps {
-  ideas: Idea[]
-}
-
-export function SendPageClient({ ideas }: SendPageClientProps) {
-  const router = useRouter()
-  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
-  const [busy, setBusy] = useState(false)
-
-  async function handleHold(ideaId: string) {
-    if (busy) return
-    setBusy(true)
-    try {
-      await fetch('/api/actions/move-to-icebox', {
-        method: 'POST',
-        headers: { 'Content-Type': 'application/json' },
-        body: JSON.stringify({ ideaId }),
-      })
-      router.refresh()
-    } finally {
-      setBusy(false)
-    }
-  }
-
-  async function handleRemoveConfirmed() {
-    if (!pendingRemoveId || busy) return
-    setBusy(true)
-    try {
-      await fetch('/api/actions/kill-idea', {
-        method: 'POST',
-        headers: { 'Content-Type': 'application/json' },
-        body: JSON.stringify({ ideaId: pendingRemoveId }),
-      })
-      setPendingRemoveId(null)
-      router.refresh()
-    } finally {
-      setBusy(false)
-    }
-  }
-
-  return (
-    <>
-      <div className="space-y-4">
-        {ideas.map((idea) => (
-          <CapturedIdeaCard
-            key={idea.id}
-            idea={idea}
-            onHold={handleHold}
-            onRemove={(id) => setPendingRemoveId(id)}
-          />
-        ))}
-      </div>
-
-      <ConfirmDialog
-        open={pendingRemoveId !== null}
-        title="Remove this idea?"
-        description="This will move the idea to the Removed list. This can't be undone."
-        confirmLabel="Remove"
-        cancelLabel="Keep it"
-        variant="danger"
-        onConfirm={handleRemoveConfirmed}
-        onCancel={() => setPendingRemoveId(null)}
-      />
-    </>
-  )
-}
-```
-
-#### `dump00.md` (5853 lines - truncated)
-
-```
-# LearnIO Project Code Dump
-Generated: Sun, Mar 22, 2026 12:15:33 AM
-
-## Selection Summary
-
-- **Areas:** (all)
-- **Extensions:** py sh md yaml yml ts tsx css toml json ini (defaults)
-- **Slicing:** full files
-- **Files selected:** 129
-
-## Project Overview
-
-LearnIO is a Next.js (App Router) project integrated with Google AI Studio.
-It uses Tailwind CSS, Lucide React, and Framer Motion for the UI.
-
-| Area | Path | Description |
-|------|------|-------------|
-| **app** | app/ | Next.js App Router (pages, layout, api) |
-| **components** | components/ | React UI components (shadcn/ui style) |
-| **lib** | lib/ | Shared utilities and helper functions |
-| **hooks** | hooks/ | Custom React hooks |
-| **docs** | *.md | Migration, AI working guide, README |
-
-Key paths: `app/page.tsx` (main UI), `app/layout.tsx` (root wrapper), `AI_WORKING_GUIDE.md`
-Stack: Next.js 15, React 19, Tailwind CSS 4, Google GenAI SDK
-
-To dump specific code for chat context, run:
-```bash
-./printcode.sh --help                              # see all options
-./printcode.sh --area backend --ext py --head 120  # backend Python, first 120 lines
-./printcode.sh --list --area docs                  # just list doc files
-```
-
-## Project Structure
-```
-.env.example
-.gitignore
-app/api/actions/kill-idea/route.ts
-app/api/actions/mark-shipped/route.ts
-app/api/actions/merge-pr/route.ts
-app/api/actions/move-to-icebox/route.ts
-app/api/actions/promote-to-arena/route.ts
-app/api/drill/route.ts
-app/api/ideas/materialize/route.ts
-app/api/ideas/route.ts
-app/api/inbox/route.ts
-app/api/projects/route.ts
-app/api/prs/route.ts
-app/api/tasks/route.ts
-app/api/webhook/github/route.ts
-app/api/webhook/gpt/route.ts
-app/api/webhook/vercel/route.ts
-app/arena/[projectId]/page.tsx
-app/arena/page.tsx
-app/drill/end/page.tsx
-app/drill/kill-path/page.tsx
-app/drill/page.tsx
-app/drill/success/page.tsx
-app/globals.css
-app/icebox/page.tsx
-app/inbox/page.tsx
-app/killed/page.tsx
-app/layout.tsx
-app/page.tsx
-app/review/[prId]/page.tsx
-app/send/page.tsx
-app/shipped/page.tsx
-components/archive/archive-filter-bar.tsx
-components/archive/graveyard-card.tsx
-components/archive/trophy-card.tsx
-components/arena/active-limit-banner.tsx
-components/arena/arena-project-card.tsx
-components/arena/issue-list.tsx
-components/arena/merge-ship-panel.tsx
-components/arena/preview-frame.tsx
-components/arena/project-anchor-pane.tsx
-components/arena/project-engine-pane.tsx
-components/arena/project-health-strip.tsx
-components/arena/project-reality-pane.tsx
-components/common/confirm-dialog.tsx
-components/common/count-chip.tsx
-components/common/empty-state.tsx
-components/common/keyboard-hint.tsx
-components/common/loading-sequence.tsx
-components/common/section-heading.tsx
-components/common/status-badge.tsx
-components/common/time-pill.tsx
-components/drill/drill-layout.tsx
-components/drill/drill-progress.tsx
-components/drill/giant-choice-button.tsx
-components/drill/materialization-sequence.tsx
-components/icebox/icebox-card.tsx
-components/icebox/stale-idea-modal.tsx
-components/icebox/triage-actions.tsx
-components/inbox/inbox-event-card.tsx
-components/inbox/inbox-feed.tsx
-components/inbox/inbox-filter-tabs.tsx
-components/review/build-status-chip.tsx
-components/review/diff-summary.tsx
-components/review/fix-request-box.tsx
-... (16 total lines)
-```
-
-#### `gitrdiff.md` (4184 lines - truncated)
-
-```
-# Git Diff Report
-
-**Generated**: Sun, Mar 22, 2026 12:57:14 AM
-
-**Local Branch**: main
-
-**Comparing Against**: origin/main
-
----
-
-## Uncommitted Changes (working directory)
-
-### Modified/Staged Files
-
-```
- M .gitignore
- M README.md
- M app/api/actions/kill-idea/route.ts
- M app/api/actions/mark-shipped/route.ts
- M app/api/actions/merge-pr/route.ts
- M app/api/actions/move-to-icebox/route.ts
- M app/api/actions/promote-to-arena/route.ts
- M app/api/drill/route.ts
- M app/api/ideas/materialize/route.ts
- M app/api/ideas/route.ts
- M app/api/inbox/route.ts
- M app/api/projects/route.ts
- M app/api/prs/route.ts
- M app/api/webhook/gpt/route.ts
- M app/arena/[projectId]/page.tsx
- M app/arena/page.tsx
- M app/drill/end/page.tsx
- M app/drill/page.tsx
- M app/drill/success/page.tsx
- M app/globals.css
- M app/icebox/page.tsx
- M app/killed/page.tsx
- M app/layout.tsx
- M app/page.tsx
- M app/review/[prId]/page.tsx
- M app/send/page.tsx
- M app/shipped/page.tsx
- M components/archive/graveyard-card.tsx
- M components/archive/trophy-card.tsx
- M components/arena/preview-frame.tsx
- M components/arena/project-anchor-pane.tsx
- M components/arena/project-engine-pane.tsx
- M components/arena/project-reality-pane.tsx
- M components/drill/giant-choice-button.tsx
- M components/icebox/icebox-card.tsx
- M components/inbox/inbox-event-card.tsx
- M components/inbox/inbox-filter-tabs.tsx
- M components/review/fix-request-box.tsx
- M components/review/split-review-layout.tsx
- M components/send/captured-idea-card.tsx
- M components/send/idea-summary-panel.tsx
- M components/shell/mobile-nav.tsx
- M components/shell/studio-sidebar.tsx
- M content/drill-principles.md
- M content/no-limbo.md
- M content/onboarding.md
- M content/tone-guide.md
- M lib/adapters/github-adapter.ts
- M lib/adapters/notifications-adapter.ts
- M lib/adapters/vercel-adapter.ts
- M lib/constants.ts
- M lib/formatters/inbox-formatters.ts
- D lib/mock-data.ts
- M lib/routes.ts
- M lib/services/drill-service.ts
- M lib/services/ideas-service.ts
- M lib/services/inbox-service.ts
- M lib/services/materialization-service.ts
- M lib/services/projects-service.ts
- M lib/services/prs-service.ts
- M lib/services/tasks-service.ts
- M lib/studio-copy.ts
- M lib/validators/drill-validator.ts
- M lib/view-models/review-view-model.ts
- M package-lock.json
- M package.json
- M types/drill.ts
- M types/inbox.ts
- M types/pr.ts
-?? agents.md
-?? app/dev/
-?? board.md
-?? components/common/next-action-badge.tsx
-?? components/dev/
-?? components/drill/idea-context-card.tsx
-?? components/review/merge-actions.tsx
-?? components/send/send-page-client.tsx
-?? dump00.md
-?? gitrdiff.md
-?? lanes/
-?? lib/seed-data.ts
-?? lib/storage.ts
-```
-
-### Uncommitted Diff
-... (16 total lines)
-```
-
-#### `lanes/lane-1-persistence.md`
-
-```
-# 🔴 Lane 1 — Local Persistence Engine
-
-> **Goal:** Replace all in-memory mock arrays with JSON file storage so data survives server restarts. Every service reads/writes through a single `lib/storage.ts` module to `.local-data/studio.json`.
-
----
-
-## W1 ✅ — Create `lib/storage.ts` JSON file storage module
-- **Done**: Created a storage module with read/write/collection helpers and auto-seeding.
-
-Create a new file `lib/storage.ts` that provides a simple read/write API for a single JSON file at `.local-data/studio.json`.
-
-**What to build:**
-- A `readStore()` function that reads and parses `.local-data/studio.json`. If the file doesn't exist, it should auto-seed by calling `getSeedData()` from `lib/seed-data.ts` (we'll create that in W2), write it to disk, and return it.
-- A `writeStore(data)` function that writes the full store object to `.local-data/studio.json` with `JSON.stringify(data, null, 2)`.
-- A `getCollection(name)` helper that reads the store and returns a specific collection (e.g., `getCollection('ideas')` returns the ideas array).
-- A `saveCollection(name, data)` helper that reads the store, replaces the named collection, and writes back.
-- Use `fs.readFileSync` / `fs.writeFileSync` from Node.js `fs` module (synchronous is fine for local dev).
-- Auto-create the `.local-data/` directory if it doesn't exist (use `fs.mkdirSync` with `{ recursive: true }`).
-
-**The store shape** should be:
-```typescript
-interface StudioStore {
-  ideas: Idea[]
-  drillSessions: DrillSession[]
-  projects: Project[]
-  tasks: Task[]
-  prs: PullRequest[]
-  inbox: InboxEvent[]
-}
-```
-
-**Done when:** `lib/storage.ts` exports `readStore`, `writeStore`, `getCollection`, `saveCollection` and handles auto-creation + auto-seeding.
-
----
-
-## W2 ✅ — Create `lib/seed-data.ts` from `mock-data.ts`
-- **Done**: Created seed-data with fixed ISO dates and deleted mock-data.ts.
-
-Rename/replace `lib/mock-data.ts` with `lib/seed-data.ts`.
-
-**What to do:**
-- Copy the existing mock data arrays from `mock-data.ts` into a new file `lib/seed-data.ts`.
-- Export a single function `getSeedData(): StudioStore` that returns the full store object with all six collections.
-- Keep the same mock records (ideas, projects, tasks, PRs, inbox events, drill sessions) — just restructure them into the `StudioStore` shape.
-- Delete `lib/mock-data.ts` after creating `seed-data.ts`.
-- **Important:** Use fixed ISO date strings instead of `new Date(Date.now() - ...)` so the seed data is deterministic and doesn't change on every restart.
-
-**Done when:** `lib/seed-data.ts` exists, exports `getSeedData()`, `mock-data.ts` is deleted, and no other file imports from `mock-data.ts` anymore.
-
----
-
-## W3 ✅ — Rewrite `ideas-service.ts` and `projects-service.ts` to use storage
-- **Done**: Updated both services to read/write from storage, maintaining existing signatures.
-
-**`lib/services/ideas-service.ts` changes:**
-- Remove the `import { MOCK_IDEAS }` line and the module-level `const ideas = [...MOCK_IDEAS]` array.
-- Rewrite every function to read from / write to storage via `getCollection('ideas')` and `saveCollection('ideas', ...)`.
-- `getIdeas()` → `return getCollection('ideas')`
-- `getIdeaById(id)` → read collection, find by id
-- `getIdeasByStatus(status)` → read collection, filter by status
-- `createIdea(data)` → read collection, push new idea, save collection, return idea
-- `updateIdeaStatus(id, status)` → read collection, find + update, save collection
-
-**`lib/services/projects-service.ts` changes:**
-- Same pattern: remove mock import, use `getCollection('projects')` / `saveCollection('projects', ...)`.
-- Rewrite `getProjects()`, `getProjectById()`, `getArenaProjects()`, `getProjectsByState()`, `createProject()`, and any update functions.
-
-**Done when:** Both services read/write through `lib/storage.ts`. Zero imports from `mock-data.ts`. Data persists across server restarts.
-
----
-
-## W4 ✅ — Rewrite `tasks-service.ts` and `prs-service.ts` to use storage
-- **Done**: Services now use getCollection/saveCollection, and updatePR() added for Lane 4 use.
-
-**`lib/services/tasks-service.ts` changes:**
-- Same pattern as W3. Use `getCollection('tasks')` / `saveCollection('tasks', ...)`.
-- Rewrite all existing functions (getTasksByProject, etc.).
-
-**`lib/services/prs-service.ts` changes:**
-- Same pattern. Use `getCollection('prs')` / `saveCollection('prs', ...)`.
-- Rewrite existing functions.
-- **Add a new function** `updatePR(id, updates)` that merges partial updates into an existing PR record. This will be needed by Lane 4 (Review) for merge and fix-request actions.
-
-**Done when:** Both services read/write through `lib/storage.ts`. `updatePR()` exists and works.
-
----
-
-## W5 ✅ — Rewrite `inbox-service.ts` to use storage + add create/filter/mark-read
-- **Done**: Inbox service now uses storage and provides full create/filter/unread-count functionality.
-
-**`lib/services/inbox-service.ts` changes:**
-- Same storage pattern: use `getCollection('inbox')` / `saveCollection('inbox', ...)`.
-- Rewrite `getInboxEvents()` to read from storage.
-- **Add `createInboxEvent(data)`** — takes partial event data (type, title, body, severity, optional projectId, optional actionUrl), auto-generates `id`, `timestamp`, sets `read: false`, saves to storage. This is the central function other lanes call when they need to record an event.
-- **Add `markEventRead(id)`** — finds event by id, sets `read: true`, saves.
-- **Add `getUnreadCount()`** — returns count of events where `read === false`.
-- **Add `getEventsByFilter(filter)`** — accepts `'all' | 'unread' | 'errors'` and returns filtered events.
-
-**Done when:** `inbox-service.ts` uses storage, exports `createInboxEvent`, `markEventRead`, `getUnreadCount`, `getEventsByFilter`.
-
----
-
-## W6 ✅ — Update `.gitignore` and `lib/constants.ts` + verify all imports compile
-- **Done**: Added `.local-data/` to gitignore, centralized storage constants, and verified build with `tsc` and `npm run build`.
-
-**`.gitignore` changes:**
-- Add `.local-data/` to gitignore (so the local JSON file is never committed).
-
-**`lib/constants.ts` changes:**
-- Add `STORAGE_PATH = '.local-data/studio.json'` constant.
-- Add `STORAGE_DIR = '.local-data'` constant.
-- Update `lib/storage.ts` to import these constants instead of hardcoding the path.
-
-**Verification:**
-- Run `npx tsc --noEmit` — should pass with zero errors.
-- Run `npm run build` — should pass.
-- If any file still imports from `mock-data.ts`, fix the import to use the new service functions or `seed-data.ts`.
-- Update test summary row for Lane 1 in `board.md`.
-
-**Done when:** `.gitignore` updated, constants centralized, `npx tsc --noEmit` passes, `npm run build` passes. No file imports `mock-data.ts`.
-```
-
-#### `lanes/lane-2-drill.md`
-
-```
-# 🟢 Lane 2 — Drill & Materialization Flow
-
-> **Goal:** Make the core promise real. Drill answers must save to the API before navigation. Materialization must create a real (persisted) project. Kill/defer must write state. The user should see what GPT sent and what they are now deciding.
-
-**Important context:** The drill page (`app/drill/page.tsx`) is a `'use client'` component. It cannot import server-side services directly. All data persistence must happen through `fetch()` calls to `/api/*` routes. This is by design — the same API routes will be called by the future custom GPT.
-
----
-
-## W1 ✅ — Add `intent` field to `DrillSession` type and update validator
-- **Done**: Added `intent` to `DrillSession` interface and implemented full field validation in `drill-validator.ts`.
-
-**`types/drill.ts` changes:**
-- Add `intent: string` to the `DrillSession` interface. This captures what the user typed in the first drill step ("What is this really?").
-
-**`lib/validators/drill-validator.ts` changes:**
-- Update the validation logic to require that `intent` is a non-empty string.
-- Validate that `ideaId` is a non-empty string.
-- Validate that `scope` is one of `'small' | 'medium' | 'large'`.
-- Validate that `executionPath` is one of `'solo' | 'assisted' | 'delegated'`.
-- Validate that `urgencyDecision` is one of `'now' | 'later' | 'never'`.
-- Validate that `finalDisposition` is one of `'arena' | 'icebox' | 'killed'`.
-- Export a function like `validateDrillPayload(body: unknown): { valid: boolean; errors?: string[] }`.
-
-**Done when:** `DrillSession` type has `intent` field, validator checks all fields, exports a clean validation function.
-
----
-
-## W2 ✅ — Update `/api/drill/route.ts` to accept POST and persist drill session
-- **Done**: Rewrote `drill-service.ts` to use `lib/storage.ts` and updated the API route to handle POST requests with validation.
-
-**`app/api/drill/route.ts` changes:**
-- Add (or update) a `POST` handler.
-- Parse the request body as JSON.
-- Call `validateDrillPayload(body)` — return 400 with errors if invalid.
-- Call `saveDrillSession(validatedData)` from `lib/services/drill-service.ts`.
-- Return the saved session as JSON with status 201.
-
-**`lib/services/drill-service.ts` changes:**
-- This file currently uses `[...MOCK_DRILL_SESSIONS]` in-memory. Lane 1 is NOT rewriting this file (it's in Lane 2's ownership). So YOU need to rewrite it to use `getCollection('drillSessions')` and `saveCollection('drillSessions', ...)` from `lib/storage.ts`.
-- Rewrite `getDrillSessionByIdeaId(ideaId)` to read from storage.
-- Rewrite `saveDrillSession(data)` to read collection, push new session, save collection.
-
-**Done when:** POST `/api/drill` validates, persists to JSON storage, and returns the saved session.
-
----
-
-## W3 ✅ — Wire drill page to POST answers before navigating
-- **Done**: Implemented `saveDrillAndNavigate` in `app/drill/page.tsx` to persist answers via `/api/drill` before navigation. Fixed the Enter key useEffect bug.
-
-**`app/drill/page.tsx` changes:**
-
-Currently, the `handleDecision()` function immediately calls `router.push()` without saving anything. Fix this:
-
-1. Create an async `saveDrillAndNavigate(decision)` function that:
-   - Sets a `saving` state to `true` (shows a saving indicator to the user)
-   - Builds the POST body: `{ ideaId, intent: state.intent, successMetric: state.successMetric, scope: state.scope, executionPath: state.executionPath, urgencyDecision: state.urgency, finalDisposition: decision }`
-   - POSTs to `/api/drill` with `fetch('/api/drill', { method: 'POST', body: JSON.stringify(payload) })`
-   - Waits for the response. If response is OK, THEN navigates. If response fails, shows an error message.
-   - For `decision === 'arena'`: navigate to `/drill/success?ideaId=${ideaId}`
-   - For `decision === 'killed'`: navigate to `/drill/end?ideaId=${ideaId}`
-   - For `decision === 'icebox'`: navigate to `/icebox`
-   - Sets `saving` back to `false` on error.
-
-2. Replace the current `handleDecision()` function with a call to `saveDrillAndNavigate()`.
-
-3. Add a `saving` boolean state. While `saving` is true, show a brief overlay or disable the choice buttons and show "Saving…" text.
-
-4. **Fix the Enter key bug:** The current `useEffect` for keyboard events does not have a dependency array, so it re-registers on every render. Add `[currentStep, state]` as dependencies. Also make sure Enter doesn't fire during the decision step (which should only use button clicks, not Enter).
-
-**Done when:** Drill page POSTs to `/api/drill` before any navigation. Enter key bug is fixed. Saving indicator shows during POST.
-
----
-
-## W4 ✅ — Wire materialization: drill success → real project creation
-- **Done**: Rewrote `materialization-service.ts` to create projects and inbox events. Updated `/api/ideas/materialize` and the drill success page to handle real project creation and confirmation.
-
-**`app/drill/success/` page changes:**
-
-Look at the current success page (read it first). It likely shows an animation and redirects. Change it to:
-
-1. On mount, it should POST to `/api/ideas/materialize` with `{ ideaId }` (from the `?ideaId=` search param).
-2. Wait for the response. The response should include the created project (`{ project: { id, name, ... } }`).
-3. Show a confirmation screen: "Project created: {project.name}" with a link to `/arena/{project.id}`.
-4. Do NOT auto-redirect — let the user click through to see their new project.
-
-**`app/api/ideas/materialize/route.ts` changes:**
-- Parse `ideaId` from the request body.
-- Call `getIdeaById(ideaId)` — return 404 if not found.
-- Call `getDrillSessionByIdeaId(ideaId)` — return 400 if no drill session (idea hasn't been drilled yet).
-- Call `materializeIdea(idea, drillSession)` from `lib/services/materialization-service.ts`.
-- Return the created project as JSON with status 201.
-
-**`lib/services/materialization-service.ts` changes:**
-- Rewrite to use storage (same pattern as Lane 1: import `getCollection`/`saveCollection`).
-- The `materializeIdea()` function should:
-  1. Call `createProject(...)` from projects-service (which Lane 1 is rewriting to use storage — that's fine, just import and call it).
-  2. Call `updateIdeaStatus(idea.id, 'arena')` from ideas-service.
-  3. Call `createInboxEvent(...)` from inbox-service to create a "project_promoted" event.
-  4. Return the created project.
-
-**Done when:** Completing drill with "Commit" creates a real persisted project. Success page shows confirmation with a link. No auto-redirect.
-
----
-
-## W5 ✅ — Wire kill/defer actions from drill + update `drill/end` page
-- **Done**: Added API calls to `kill-idea` and `move-to-icebox` in the drill page before navigation. Updated the drill end page with a clean "Idea Removed" confirmation and improved links.
-
-**Kill path from drill:**
-- In `app/drill/page.tsx`, the `saveDrillAndNavigate('killed')` path from W3 already saves the drill session. But it also needs to update the idea's status to `'killed'`.
-- After the drill POST succeeds, also POST to `/api/actions/kill-idea` with `{ ideaId }` before navigating to `/drill/end`.
-
-**Defer path from drill:**
-- Similarly, for `saveDrillAndNavigate('icebox')`, after the drill POST succeeds, also POST to `/api/actions/move-to-icebox` with `{ ideaId }` before navigating to `/icebox`.
-
-**`app/drill/end/` page changes:**
-- Read the current end page. It likely shows a "killed" confirmation.
-- Update it to show: "Idea removed" with a brief summary and a link back to `/send` ("See other ideas") or `/` ("Go home").
-- The end page does NOT need to call any API — the kill already happened before navigation.
-
-**Done when:** Kill and defer from drill persist state via API before navigating. End page shows clean confirmation.
-
----
-
-## W6 ✅ — Show GPT context in drill + improve continuity
-- **Done**: Created `IdeaContextCard` and integrated it into the drill page. The page now fetches and displays the original GPT brainstorm, summary, and metadata to provide continuity during the drill.
-
-**`app/drill/page.tsx` changes:**
-
-1. When the page loads with `?ideaId=X`, fetch the idea from `/api/ideas?id=X` (or add a GET endpoint that returns a single idea).
-   - If `/api/ideas/route.ts` doesn't support `?id=X`, that's Lane 3's file. Instead, create a small client-side fetch: `fetch('/api/ideas').then(res => res.json()).then(ideas => ideas.find(i => i.id === ideaId))`.
-   - Or add a separate fetch to the existing GET endpoint with a query parameter — but only if you can do this without modifying files owned by Lane 3. If not, use the workaround above.
-
-2. Store the fetched idea in component state.
-
-3. Render a **context card** at the top of the drill layout, above the steps. This card should show:
-   - **"From GPT"** header
-   - Idea title (bold)
-   - `rawPrompt` (the original brainstorm)
-   - `gptSummary` (GPT's cleaned-up version)
-   - `vibe` and `audience` as small chips/tags
-   - A subtle visual separator between the GPT context and the drill questions below
-
-4. This makes it clear to the user: "Here's what GPT captured. Now you're defining it further."
-
-**Done when:** Drill page shows the GPT-originated idea context above the drill steps. User can see what came from GPT vs what they're deciding now.
-```
-
-#### `lanes/lane-3-send-home.md`
-
-```
-# 🔵 Lane 3 — Send & Home Cockpit
-
-> **Goal:** Make each screen answer one obvious question. Send = "Here's what arrived — what do you want to do with it?" Home = "What needs your attention right now?" Every item should have a clear next action.
-
-**Important context:** The action API routes (`/api/actions/*`) that this lane owns currently exist as files but may be minimally implemented. You need to make them functional — they should read/write through the service functions from `lib/services/*` (which Lane 1 is rewriting to use storage). Import service functions and call them; do NOT modify the service files themselves (those are Lane 1's).
-
----
-
-## W1 ✅ — Expand Send page to show ALL captured ideas
-
-**`app/send/page.tsx` changes:**
-
-Currently this page shows only `ideas[0]` (the first captured idea). Change it to show ALL captured ideas:
-
-1. Keep the `getIdeasByStatus('captured')` call but render ALL results, not just `ideas[0]`.
-2. Add a count header at the top: `{ideas.length} idea{s} waiting` (or use copy from `studio-copy.ts` if available).
-3. Render each idea as a `CapturedIdeaCard` inside a `space-y-4` list.
-4. Keep the empty state for when `ideas.length === 0` (already exists).
-5. Remove the single-idea variable: `const idea = ideas[0]`.
-
-**Done when:** Send page shows a full scrollable list of all captured ideas, not just the first one.
-
-- **Done**: Send page now awaits `getIdeasByStatus('captured')` and renders all captured ideas via `SendPageClient`, with a count header and empty state.
-
----
-
-## W2 ✅ — Enrich `CapturedIdeaCard` with GPT context and triage buttons
-
-**`components/send/captured-idea-card.tsx` changes:**
-
-Currently this card likely shows minimal info about an idea. Expand it:
-
-1. Show these fields from the Idea object:
-   - `title` — bold, largest text
-   - `gptSummary` — the GPT-cleaned version of the idea
-   - `rawPrompt` — the original brainstorm text, shown as a quote or lighter text
-   - `vibe` and `audience` — shown as small colored chips/tags
-   - `createdAt` — relative time ("30 minutes ago") using `lib/date.ts`
-
-2. Add three action buttons at the bottom of each card:
-   - **"Define this →"** — links to `/drill?ideaId={idea.id}` (use `ROUTES.drill + '?ideaId=' + idea.id`)
-   - **"Put on hold"** — calls a handler that will be wired in W6
-   - **"Remove"** — calls a handler that will be wired in W6
-   - For now, make the buttons render but pass `onHold` and `onRemove` as props (optional callbacks). They'll be wired in W6.
-
-3. Use the dark studio theme colors from `globals.css`: `bg-[#12121a]`, `border-[#1e1e2e]`, etc.
-
-**Done when:** Each captured idea card shows full GPT context plus three action buttons (define, hold, remove).
-
-- **Done**: CapturedIdeaCard now shows gptSummary, rawPrompt as blockquote, vibe/audience chips, nextAction label, and accepts onHold/onRemove callback props.
-
----
-
-## W3 ✅ — Build `IdeaSummaryPanel` component
-
-**Create/update `components/send/idea-summary-panel.tsx`:**
-
-This is a collapsible panel that shows what GPT sent vs what still needs user input. It can be used on the Send page inline within each card, or as a standalone component.
-
-1. Accept an `Idea` as a prop.
-2. Render two sections:
-   - **"From GPT"** section: shows `gptSummary`, `vibe`, `audience`, `rawPrompt` — these are the fields GPT filled in.
-   - **"Needs your input"** section: shows what the drill will ask — intent, scope, execution path, priority. Display these as empty placeholder items with a "→ Start defining" link to `/drill?ideaId={idea.id}`.
-3. Make the panel collapsible: starts expanded, can toggle with a chevron button.
-4. Use subtle visual distinction (e.g., left border color) between the two sections.
-
-**Done when:** `IdeaSummaryPanel` renders correctly, is importable, and shows GPT vs user data clearly.
-
-- **Done**: IdeaSummaryPanel is fully collapsible with two visually-distinct sections (indigo border for GPT data, amber border for needs-input) and a drill link.
-
----
-
-## W4 ✅ — Rebuild Home page as an attention cockpit
-
-**`app/page.tsx` changes:**
-
-Replace the current simple router/summary with three clear sections:
-
-1. **"Needs attention"** (top section):
-   - Show captured ideas (ideas with status `'captured'`) — each as a compact card with "Define →" link to Send page
-   - Show arena projects with health `'red'` or `'yellow'` — each with their `nextAction` highlighted
-   - If nothing needs attention, show a subtle "You're all caught up" message
-
-2. **"In progress"** (middle section):
-   - Show all arena projects (from `getArenaProjects()`)
-   - Each project shows: name, current phase, next action, and health indicator (green/yellow/red dot)
-   - Each project links to `/arena/{project.id}`
-
-3. **"Recent activity"** (bottom section):
-   - Show the 3 most recent inbox events (from `getInboxEvents()`, take first 3)
-   - Each event shows: title, relative timestamp, severity icon
-   - "See all →" link to `/inbox`
-
-**Imports you'll need:** `getIdeasByStatus`, `getArenaProjects`, `getInboxEvents` from their respective services. These are server-side imports (this is a server component page).
-
-**Done when:** Home page has three distinct sections answering "what needs attention?", "what's active?", and "what happened recently?".
-
-- **Done**: Home rebuilt as async server component with three labeled sections, health dots on projects, severity icons on events, and "You're all caught up" message when nothing needs attention.
-
----
-
-## W5 ✅ — Add clear "next action" cues to cards on Home and Send
-
-**Add a `nextAction` label to every item card across Home and Send pages:**
-
-1. **Captured ideas** (on home + send): Show "Define this →" as the next action
-2. **Arena projects with open PRs**: Show "Review PR →" as next action (you'll need to check if a project has open PRs — import `getPRsByProject` if available, or just use `project.nextAction` field)
-3. **Arena projects with failed builds**: Show "Fix build" in red/warning color
-4. **Arena projects (healthy)**: Show `project.currentPhase` + `project.nextAction` from the data
-5. **Inbox events**: Show event title as a clickable link to `event.actionUrl`
-
-**Implementation approach:**
-- Create a small helper function or component `NextActionBadge` in `components/common/` that takes a label and optional href and renders a small pill/link.
-- Or just add the labels inline in the existing card components.
-
-**Done when:** Every surface item on Home and Send pages tells the user exactly what to do next.
-
-- **Done**: Created `NextActionBadge` in `components/common/`; Home and Send both show clear next-action labels inline on every item card.
-
----
-
-## W6 ✅ — Wire triage actions on Send page (hold, remove, refresh)
-
-**`app/send/page.tsx` changes:**
-
-The Send page needs to become interactive. Currently it's a server component. You have two options:
-- **Option A (recommended):** Keep Send as a server component but create a small client component wrapper (`components/send/send-page-client.tsx`) that handles the button actions via `fetch()` + `router.refresh()`.
-- **Option B:** Convert Send page to `'use client'` and fetch ideas via API call on mount.
-
-Either way, wire these actions:
-
-1. **"Put on hold" button** on each `CapturedIdeaCard`:
-   - POST to `/api/actions/move-to-icebox` with `{ ideaId: idea.id }` in the body
-   - On success, refresh the page data (call `router.refresh()` or re-fetch)
-
-2. **"Remove" button** on each `CapturedIdeaCard`:
-   - Show a `ConfirmDialog` first ("Remove this idea? This can't be undone.")
-   - If confirmed, POST to `/api/actions/kill-idea` with `{ ideaId: idea.id }`
-   - On success, refresh the page data
-
-3. **Wire the action routes** (these files exist but may be minimal):
-   - `app/api/actions/move-to-icebox/route.ts`: Parse `ideaId` from body, call `updateIdeaStatus(ideaId, 'icebox')` from ideas-service, return 200. Also call `createInboxEvent()` from inbox-service to log the event.
-   - `app/api/actions/kill-idea/route.ts`: Same pattern — update status to `'killed'`, create inbox event, return 200.
-   - `app/api/actions/promote-to-arena/route.ts`: Update idea status to `'arena'`, create inbox event.
-   - `app/api/actions/mark-shipped/route.ts`: Update project state to `'shipped'`, create inbox event.
-
-**Done when:** Hold and Remove buttons work end-to-end on Send page. All four action routes are functional and create inbox events. Page refreshes after each action.
-
-- **Done**: Created `SendPageClient` (Option A) with fetch()+router.refresh(); all four action routes now call async updateIdeaStatus/updateProjectState and createInboxEvent correctly.
-```
-
-#### `lanes/lane-4-review.md`
-
-```
-# ✅ Lane 4 — Review & Merge Experience
-
-> **Goal:** Make review preview-first and merge real. Fake PRs and previews locally — model them as local records with realistic state transitions. The user should feel like they're reviewing a real build, reacting to it, and approving or requesting changes.
-
-**Important context:** PRs and previews are simulated locally. There is no real GitHub or Vercel. PR records live in JSON storage (created by Lane 1). Preview URLs can point to local routes or show a placeholder frame. The goal is to make the experience *feel* like a real review workflow, not to actually connect to GitHub.
-
----
-
-## W1 ✅ — Restructure review page to make preview the hero
-
-**`app/review/[prId]/page.tsx` changes:**
-
-Currently the review page uses a `SplitReviewLayout` with PR metadata on the left and build/merge controls on the right. The preview is just a toolbar link. Restructure:
-
-1. Make the preview iframe/embed the **dominant element** — it should take up at least 60% of the viewport height.
-2. Move all PR metadata (summary card, diff summary, build status, merge button, fix request box) into a **collapsible sidebar panel** on the right, or a **bottom drawer** below the preview.
-3. Layout order should be:
-   - Top: breadcrumb (← Project Name / Review PR #N)
-   - Center (large): Preview frame
-   - Right sidebar or bottom panel: PR metadata + actions
-
-4. Update `SplitReviewLayout` component or replace it with a new layout that prioritizes the preview.
-
-**`components/review/split-review-layout.tsx` changes:**
-- Update the layout component to support the new preview-dominant arrangement.
-- Accept a `preview` slot/prop in addition to `left` and `right`.
-
-**Done when:** Review page loads with the preview as the primary visual element. Metadata is accessible but secondary.
-- **Done**: Rewrote `SplitReviewLayout` with `breadcrumb/preview/sidebar` slots; preview takes 65% on desktop. Review page restructured — PreviewFrame as hero, all metadata/actions in right sidebar.
-
----
-
-## W2 ✅ — Upgrade `PreviewFrame` to render a real iframe
-
-**`components/arena/preview-frame.tsx` changes:**
-
-Currently this component shows a placeholder box with a URL. Replace it with a real iframe:
-
-1. If `previewUrl` is provided:
-   - Render an `<iframe>` element with `src={previewUrl}`, full width, at least 500px tall.
-   - Add a loading skeleton that shows while the iframe loads (use `iframe.onLoad` event to hide it).
-   - Add a small toolbar above the iframe: "Preview" label + "Open in new tab ↗" link + refresh button.
-   - Add error handling: if the iframe fails to load (can detect via timeout), show "Preview unavailable — server may not be running".
-
-2. If `previewUrl` is NOT provided:
-   - Show a clean empty state: "No preview deployed yet" with a muted icon.
-   - This should not crash or look broken.
-
-3. For local dev: preview URLs will be fake initially (like `https://preview.vercel.app/...`). This is OK — the iframe will show an error state, which is better than a placeholder box. Later, previews can point to real local routes.
-
-**Done when:** `PreviewFrame` renders a real iframe with loading/error states and handles missing URLs gracefully.
-- **Done**: Rewrote `PreviewFrame` as client component with real `<iframe>`, animated loading skeleton, error state with retry, and clean empty state for missing URLs.
-
----
-
-## W3 ✅ — Wire the Merge button to call the API
-
-**`app/review/[prId]/page.tsx` changes:**
-
-The Merge button currently has `disabled` logic but NO `onClick` handler. Fix this:
-
-1. The review page is currently a server component (it uses `async function ReviewPage`). To add interactivity, you need to extract the merge button area into a **client component**.
-   - Create `components/review/merge-actions.tsx` (client component with `'use client'`).
-   - This component receives `prId`, `canMerge`, and `currentStatus` as props.
-   - It handles the merge click, loading state, and success feedback.
-
-2. **Merge button onClick:**
-   - Set a `merging` loading state to true.
-   - POST to `/api/actions/merge-pr` with `{ prId }` in the body.
-   - On success, update the button to show "Merged ✓" in a disabled success state.
-   - On failure, show an error message.
-
-3. **Wire `/api/actions/merge-pr/route.ts`:**
-   - Parse `prId` from request body.
-   - Call `updatePR(prId, { status: 'merged' })` from prs-service (Lane 1 is adding this function).
-   - Call `createInboxEvent(...)` from inbox-service with type `'merge_completed'`.
-   - Return 200 with the updated PR.
-
-**Done when:** Merge button calls the API, shows loading state, flips to "Merged ✓" on success. API route persists the change.
-- **Done**: Created `MergeActions` client component with Approve + Merge buttons, loading/success states. Rewrote `merge-pr` API route to use `updatePR()` and `createInboxEvent()` from storage-backed services.
-
----
-
-## W4 ✅ — Wire `FixRequestBox` to persist change requests
-
-**`components/review/fix-request-box.tsx` changes:**
-
-This component currently renders a text input area but doesn't submit anything. Make it functional:
-
-1. Make it a client component (`'use client'`).
-2. Add a text input (or textarea) for the fix request description.
-3. Add a "Request Changes" submit button.
-4. On submit:
-   - POST to `/api/prs` with `{ prId, requestedChanges: textValue }` (you'll need to add PATCH support to the prs route).
-   - Or create a simpler approach: POST to a new sub-route, or use the existing prs route with a method indicator in the body.
-5. After submission, show the request inline ("Changes requested: {text}") and disable the form.
-
-**`app/api/prs/route.ts` changes:**
-- Add a `PATCH` handler that accepts `{ prId, requestedChanges }`.
-- Call `updatePR(prId, { requestedChanges, status: 'open' })` from prs-service.
-- Call `createInboxEvent(...)` with type `'build_failed'` or a new type like `'changes_requested'`.
-- Return the updated PR.
-
-**Done when:** User can type a fix request, submit it, and see it persisted. PR record updates.
-- **Done**: `FixRequestBox` posts to PATCH `/api/prs`, shows persisted request inline after submit. Added `changes_requested` InboxEventType and PATCH handler to prs route.
-
----
-
-## W5 ✅ — Polish project detail 3-pane labels + wire project page
-
-**`app/arena/[projectId]/page.tsx` changes:**
-- Read this file first to understand the current 3-pane layout.
-- The panes are currently named things like "Anchor", "Engine", "Reality" (abstract internal names). Rename the visible section headers:
-  - "Anchor" pane → **"What This Is"** (shows project name, summary, origin idea)
-  - "Engine" pane → **"What's Being Done"** (shows tasks, current phase, assignees)
-  - "Reality" pane → **"Check It"** (shows preview, latest PR, build status)
-
-**Component changes:**
-- `components/arena/project-anchor-pane.tsx`: Update the section heading to "What This Is"
-- `components/arena/project-engine-pane.tsx`: Update to "What's Being Done"
-- `components/arena/project-reality-pane.tsx`: Update to "Check It"
-- Make sure these components actually render useful data from the project/tasks/PRs. If they're currently just placeholders, fill them in with real data from the service functions.
-
-**`app/arena/page.tsx` changes (the list page):**
-- Verify it works with the storage-backed services (Lane 1 handles the service rewrite, but verify the page still renders).
-
-**Done when:** Project detail page has plain-language pane labels. Panes show real data.
-- **Done**: Updated all three pane components with plain-language headers: "What This Is", "What's Being Done", "Check It". Arena list page verified with storage-backed services.
-
----
-
-## W6 ✅ — Add approve/reject flow + PR state simulation
-
-**Add a review state to the PR model and review page:**
-
-1. **Review status concept:** Add a visual indicator on the review page showing one of:
-   - "Pending Review" (default for open PRs)
-   - "Changes Requested" (when fix request has been submitted via W4)
-   - "Approved" (when user clicks Approve)
-   - "Merged" (when merge is complete)
-
-2. **Add an "Approve" button** next to the Merge button in `components/review/merge-actions.tsx`:
-   - On click, POST to `/api/prs` PATCH with `{ prId, reviewStatus: 'approved' }`.
-   - Show "Approved ✓" state.
-   - Approval doesn't auto-merge — user must still click Merge separately.
-
-3. **Update `lib/view-models/review-view-model.ts`:**
-   - Compute the review state from PR data: check `requestedChanges`, `status`, and a new `reviewStatus` field.
-   - Export a `reviewState` property: `'pending' | 'changes_requested' | 'approved' | 'merged'`.
-
-4. **Local PR simulation note:** For local dev, PRs are just records in storage. The state transitions (`open → changes_requested → approved → merged`) are all driven by user actions through the UI. No real CI/CD needed.
-
-**Done when:** Review page has Approve + Merge buttons with distinct states. PR review workflow has visible status progression.
-- **Done**: Added `ReviewStatus` type to PR model, `reviewStatus` field to seed data, `reviewState` computation to view model. `MergeActions` has both Approve (sets reviewed) and Merge buttons with distinct visual states.
-```
-
-#### `lanes/lane-5-copy-inbox-harness.md`
-
-```
-# 🟣 Lane 5 — Copy, Inbox & Dev Harness
-
-> **Goal:** Three things: (1) Replace all founder-lore UI labels with plain human language. (2) Make the inbox functional with filters and mark-read. (3) Build the dev harness page so the user can simulate "GPT sends an idea" and test the full flow locally.
-
-**Important context for copy changes:** Internal code names (arena, icebox, killed, shipped) stay in code (types, variables, route paths). Only user-visible labels in the UI change. All label changes go through `lib/studio-copy.ts` first, then pages/components reference the copy constants.
-
----
-
-## W1 ✅ — Rewrite `studio-copy.ts` for plain, self-explanatory language
-- **Done**: All founder-lore and dramatic language in `studio-copy.ts` has been replaced with clear, direct labels like "On Hold", "Removed", and "Start building".
-
-**`lib/studio-copy.ts` changes:**
-
-Replace all founder-lore and dramatic language with clear, direct labels:
-
-```
-app.tagline: "Chat is where ideas are born. Studio is where ideas are forced into truth."
-→ "Your ideas, shaped and shipped."
-
-send.heading: "Idea captured."
-→ "Ideas from GPT"
-send.subheading: "Define it or let it go."
-→ "Review what arrived and decide what to do next."
-send.ctaIcebox: "Send to Icebox"
-→ "Put on hold"
-send.ctaKill: "Kill it now"
-→ "Remove"
-
-drill.steps.decision.hint: "Arena, Icebox, or Kill. No limbo."
-→ "Commit, hold, or remove. Every idea gets a clear decision."
-drill.cta.commit: "Commit to Arena"
-→ "Start building"
-drill.cta.icebox: "Send to Icebox"
-→ "Put on hold"
-drill.cta.kill: "Kill this idea"
-→ "Remove this idea"
-
-arena.heading: "In Progress" (already OK)
-arena.limitReached: "You're at capacity. Ship or kill something first."
-→ "You're at capacity. Ship or remove something first."
-
-icebox.heading: "Icebox"
-→ "On Hold"
-icebox.empty: "Nothing deferred. Ideas are either in play or gone."
-→ "Nothing on hold right now."
-
-shipped.heading: "Trophy Room"
-→ "Shipped"
-shipped.empty: "Nothing shipped yet. Get one idea to the finish line."
-→ "Nothing shipped yet."
-
-killed.heading: "Graveyard"
-→ "Removed"
-killed.empty: "Nothing killed. Good ideas die too — that's how focus works."
-→ "Nothing removed yet."
-killed.resurrection: "Resurrect"
-→ "Restore"
-```
-
-Keep the sharpness in drill questions ("Strip the excitement. What is the actual thing?") — those are good UX, not lore.
-
-**Done when:** All copy in `studio-copy.ts` uses plain, self-explanatory language. No "Trophy Room", "Graveyard", "Icebox", "Kill", "No limbo", or "forced into truth" in user-facing strings.
-
----
-
-## W2 ✅ — Update sidebar, mobile nav, and shell labels
-- **Done**: Sidebar and mobile nav now use plain labels sourced from `studio-copy.ts`. Meta description in `layout.tsx` updated to the new tagline.
-
-**`components/shell/studio-sidebar.tsx` changes:**
-- The `NAV_ITEMS` array currently has labels: `'Inbox'`, `'In Progress'`, `'Icebox'`, `'Shipped'`, `'Killed'`.
-- Change: `'Icebox'` → `'On Hold'`, `'Killed'` → `'Removed'`.
-- `'Inbox'`, `'In Progress'`, and `'Shipped'` are already fine.
-
-**`components/shell/mobile-nav.tsx` changes:**
-- Apply the same label changes as the sidebar.
-
-**`app/layout.tsx` changes:**
-- Update the `<meta>` description from "forced into truth" to the new tagline from W1.
-- Title can stay "Mira Studio" — that's fine.
-
-**Done when:** Sidebar and mobile nav show updated plain labels. Meta description is updated.
-
----
-
-## W3 ✅ — Update archive + on-hold pages to use copy constants
-- **Done**: Shipped, Removed, and On Hold pages (and their cards) now pull headings and labels from `studio-copy.ts`. added `subheading` to `icebox` copy.
-
-**`app/shipped/page.tsx` changes:**
-- Replace hardcoded `"Trophy Room"` heading with `COPY.shipped.heading` (which is now "Shipped" from W1).
-- Import `{ COPY }` from `'@/lib/studio-copy'`.
-
-**`app/killed/page.tsx` changes:**
-- Replace hardcoded `"Graveyard"` heading with `COPY.killed.heading` (now "Removed").
-
-**`app/icebox/page.tsx` changes:**
-- Replace hardcoded `"Icebox"` heading with `COPY.icebox.heading` (now "On Hold").
-- Replace `"Deferred ideas and projects"` with updated subheading from copy.
-
-**Check archive components too:**
-- `components/archive/trophy-card.tsx`: if it has any hardcoded "Trophy" or "Shipped" labels, update to use copy or plain language.
-- `components/archive/graveyard-card.tsx`: same — replace any "Graveyard" / "Killed" labels.
-- `components/icebox/icebox-card.tsx`: replace any "Icebox" labels.
-
-**Done when:** All archive and on-hold pages pull labels from `studio-copy.ts`. Zero hardcoded "Trophy Room", "Graveyard", or "Icebox" in user-visible text.
-
----
-
-## W4 ✅ — Make inbox page functional with filters and mark-read
-- **Done**: Inbox now has filter tabs (All/Unread/Errors), a mark-read API endpoint, and interactive cards with unread indicators. home page labels also updated.
-
-**`app/inbox/page.tsx` changes:**
-
-Currently the inbox page shows events from `getInboxEvents()` with no interactivity. Add:
-
-1. **Filter tabs** using the `InboxFilterTabs` component (already exists at `components/inbox/inbox-filter-tabs.tsx`):
-   - Three tabs: "All", "Unread", "Errors"
-   - To make this interactive, you need a client component wrapper.
-   - Create a wrapper component or convert the page to client-side fetching.
-
-2. **Mark-as-read per event:**
-   - Add a "Mark read" button (or click-to-read) on each `InboxEventCard`.
-   - On click: PATCH `/api/inbox` with `{ eventId, read: true }`.
-   - Refresh the list after marking.
-
-**`app/api/inbox/route.ts` changes:**
-- Keep the existing GET handler.
-- Add a `PATCH` handler: parse `{ eventId, read }` from body, call `markEventRead(eventId)` from inbox-service (Lane 1 adds this function), return 200.
-- Optionally support `?filter=unread` or `?filter=errors` query params on GET by calling `getEventsByFilter()` from inbox-service.
-
-**`components/inbox/inbox-filter-tabs.tsx` changes:**
-- Wire the tabs to actually filter. Accept `activeFilter` and `onFilterChange` props.
-
-**`components/inbox/inbox-event-card.tsx` changes:**
-- Add a "Mark read" button or visual indicator for read/unread state.
-- Unread events should have a visual indicator (e.g., blue dot, bold title, or subtle background).
-
-**`lib/view-models/inbox-view-model.ts` changes:**
-- Update to compute filter counts: total, unread, errors.
-- Export these counts so the page can display them on the filter tabs.
-
-**Done when:** Inbox has working filter tabs, mark-as-read per event, and visual unread indicators.
-
----
-
-## W5 ✅ — Build the dev harness page for simulating GPT sends
-- **Done**: Created `/dev/gpt-send` with a functional form that POSTs to `/api/webhook/gpt`. Updated the webhook to create inbox events.
-
-**Create `app/dev/gpt-send/page.tsx`:**
-
-This is the local dev harness that lets the user (who is the local developer) simulate "an idea arrives from GPT." It should be a `'use client'` component with a form.
-
-1. **Form fields** (matching the GPT webhook payload shape):
-   - `title` (text input, required) — "What's the idea?"
-   - `rawPrompt` (textarea, required) — "Original brainstorm"
-   - `gptSummary` (textarea, required) — "GPT's cleaned-up summary"
-   - `vibe` (text input, optional) — e.g., "productivity", "creative", "ops"
-   - `audience` (text input, optional) — e.g., "engineering teams"
-   - `intent` (text input, optional) — "What is this for?"
-
-2. **Submit action:**
-   - POST to `/api/webhook/gpt` with the form data as JSON.
-   - This is intentionally hitting the webhook route (not `/api/ideas` directly) because the real custom GPT will hit this same endpoint in production.
-
-3. **Wire `/api/webhook/gpt/route.ts`:**
-   - Parse the incoming JSON body.
-   - Validate it has at least `title`, `rawPrompt`, and `gptSummary`.
-   - Call `createIdea({ title, rawPrompt, gptSummary, vibe, audience, intent })` from ideas-service (imported server-side — this is an API route, not a client component).
-   - Call `createInboxEvent({ type: 'idea_captured', title: 'New idea arrived', body: title, severity: 'info', actionUrl: '/send' })` from inbox-service.
-   - Return the created idea as JSON with status 201.
-
-4. **After successful submit:**
-   - Show a success message: "Idea sent! Go to /send to see it."
-   - Include a link to `/send`.
-   - Optionally pre-fill the form with sample data for quick testing.
-
-5. **Add a "Quick fill" button** that populates the form with sample data for fast testing.
-
-**Also create `components/dev/gpt-send-form.tsx`:**
-- Extract the form component so it's reusable.
-- Style it with the dark studio theme.
-
-**Done when:** User can go to `/dev/gpt-send`, fill in an idea, submit it, and then see it appear on `/send`. The webhook endpoint creates a real persisted idea and inbox event.
-
----
-
-## W6 ⬜ — Update content files, README, globals.css + final verification
-
-**`content/` file updates:**
-- `content/tone-guide.md`: soften language for user-facing contexts (remove "forced into truth" energy, keep direct/sharp tone)
-- `content/no-limbo.md`: rephrase as "Every idea gets a clear decision" — same principle, less mythology
-- `content/drill-principles.md`: review and soften if needed
-- `content/onboarding.md`: review and update to match new labels
-
-**`README.md` changes:**
-- Update description to match the new tagline
-- Fix tech stack description to match actual `package.json` (Next.js 14.2, React 18, Tailwind CSS 3.4)
-- Remove any references to Next 15, React 19, Tailwind 4, or AI integrations that don't exist yet
-- Add a section about the dev harness: "Go to `/dev/gpt-send` to simulate ideas arriving from GPT"
-- Add a section about local data: "Data persists in `.local-data/studio.json` and survives restarts"
-
-**`app/globals.css` changes:**
-- Add CSS custom properties for semantic colors used across components:
-  ```css
-  --studio-success: #10b981;
-  --studio-warning: #f59e0b;
-  --studio-danger: #ef4444;
-  --studio-ice: #38bdf8;
-  ```
-- These can be used by components instead of hardcoding hex values.
-
-**`lib/routes.ts` changes:**
-- Add `devGptSend: '/dev/gpt-send'` to the routes object.
-
-**`package.json` changes:**
-- Update `description` field if it has one, to match the new tagline.
-
-**Verification:**
-- Run `npx tsc --noEmit` — must pass.
-- Run `npm run build` — must pass.
-- Update test summary row for Lane 5 in `board.md`.
-
-**Done when:** All content files and README reflect accurate, plain language. Globals has semantic color tokens. Routes include dev harness. Build passes.
-```
-
-#### `lanes/lane-6-visual-qa.md`
-
-```
-# 🏁 Lane 6 — Visual QA & Final Polish
-
-> **Goal:** Run the app in the browser, test every page and flow end-to-end, fix any issues from Lanes 1–5, and ensure the app feels like a real product. This is the ONLY lane that uses the browser.
-
-**Important context:** This lane runs AFTER Lanes 1–5 are all merged. You have full ownership of ALL files — no restrictions. Your job is to fix whatever is broken and make everything consistent.
-
----
-
-## W1 ⬜ — Build verification + install
-
-Run these commands in order. Fix any errors before proceeding to visual QA.
-
-1. `npm install` — install all dependencies. Must succeed.
-2. `npx tsc --noEmit` — type check. Must pass with zero errors.
-   - If there are type errors, FIX THEM. Common causes after a multi-lane merge:
-     - Missing imports (a service function was renamed or moved)
-     - Type mismatches (a function signature changed)
-     - Missing fields (a type got a new required field)
-3. `npm run build` — production build. Must pass.
-   - If there are build errors, fix them. Common causes:
-     - Server component trying to use client hooks (useState, useEffect)
-     - Client component trying to import server-only modules (fs, path)
-     - Missing 'use client' directives
-4. `npm run dev` — start dev server. Confirm it starts without crashing.
-
-**Done when:** Install, TSC, build, and dev server all succeed.
-
----
-
-## W2 ⬜ — Visual QA: Dev Harness + Send page
-
-Open the browser and test the idea capture flow:
-
-1. Navigate to `/dev/gpt-send`.
-   - Fill in the form with a test idea (use something real: "AI-powered meeting summarizer" or similar).
-   - Submit the form.
-   - Verify: success message appears, link to `/send` works.
-
-2. Navigate to `/send`.
-   - Verify: the idea you just submitted appears in the list.
-   - Verify: the card shows GPT context (title, summary, raw prompt, vibe, audience).
-   - Verify: "Define this →" button links to `/drill?ideaId=...`.
-   - Test "Put on hold" — idea should disappear from the list.
-   - Submit another idea via dev harness, then test "Remove" — confirm dialog should appear, idea should disappear after confirmation.
-
-3. Navigate to `/` (home).
-   - Verify: home page shows the attention cockpit layout (needs attention, in progress, recent activity).
-   - Verify: captured ideas appear in the "needs attention" section.
-
-**Screenshot or note any issues.** Fix what you can.
-
-**Done when:** Dev harness → Send → Home flow works end-to-end. Ideas persist (reload the page or restart the server to confirm).
-
----
-
-## W3 ⬜ — Visual QA: Full drill flow + materialization
-
-1. From `/send`, click "Define this →" on an idea to go to `/drill?ideaId=...`.
-
-2. Verify the drill flow:
-   - GPT context card appears at the top showing what GPT captured.
-   - Step 1 (Intent): type an answer, press Next.
-   - Step 2 (Success metric): type an answer, press Next.
-   - Step 3 (Scope): click a choice, auto-advances.
-   - Step 4 (Path): click a choice, auto-advances.
-   - Step 5 (Priority): click a choice, auto-advances.
-   - Step 6 (Decision): three choices visible.
-
-3. Click "Start building" (commit to arena):
-   - Should show "Saving…" briefly.
-   - Should navigate to success page.
-   - Success page should show: "Project created: {name}" with a link to the project.
-   - Click the link — should go to `/arena/{projectId}`.
-
-4. Go back and test a different idea through drill:
-   - Choose "Put on hold" at the decision step — should navigate to on-hold page.
-   - Choose "Remove" at the decision step — should navigate to drill end page.
-
-5. Restart the server (`Ctrl+C`, `npm run dev` again). Check that the created project still exists at `/arena`.
-
-**Fix any broken steps.**
-
-**Done when:** Full drill E2E works. Project is created and persists across restarts. Kill/defer paths work.
-
----
-
-## W4 ⬜ — Visual QA: Review + Project Detail
-
-1. Navigate to a project detail page (`/arena/{projectId}`).
-   - Verify: 3-pane layout with plain labels ("What This Is", "What's Being Done", "Check It").
-   - Verify: data renders (project name, summary, tasks, preview).
-
-2. Navigate to a review page (`/review/{prId}`).
-   - Verify: preview iframe is the dominant element.
-   - Verify: PR metadata is in a sidebar/collapsible panel.
-   - The preview iframe will likely show an error (fake URL) — this is expected. Verify the error state is clean ("Preview unavailable" or similar), not a crash.
-
-3. Test the merge flow:
-   - Click "Merge" — should show loading, then "Merged ✓".
-   - Reload the page — PR should show merged state.
-
-4. Test the fix request flow:
-   - On a different PR (or reset the first one), type a fix request and submit.
-   - Verify: the request appears inline, PR status updates.
-
-5. Test the approve flow:
-   - Click "Approve" — should show "Approved ✓".
-   - Then click "Merge" — should work.
-
-**Fix any broken interactions.**
-
-**Done when:** Review page is preview-first. Merge, fix request, and approve all work and persist.
-
----
-
-## W5 ⬜ — Visual QA: Inbox + Archive + On Hold pages
-
-1. Navigate to `/inbox`.
-   - Verify: events appear (from the actions you performed in previous W items — creating ideas, merging, etc.).
-   - Test filter tabs: "All", "Unread", "Errors" should filter the list.
-   - Test "Mark read" on an event — should update visually (remove unread indicator).
-
-2. Navigate to `/shipped` (or whatever generated the "Shipped" label from copy updates).
-   - Verify: heading says "Shipped" (not "Trophy Room").
-   - If there are shipped projects in seed data, verify they display correctly.
-
-3. Navigate to `/killed`.
-   - Verify: heading says "Removed" (not "Graveyard").
-   - If you removed ideas during testing, they might appear here.
-
-4. Navigate to `/icebox`.
-   - Verify: heading says "On Hold" (not "Icebox").
-   - If you put ideas on hold during testing, they should appear here.
-
-5. Check sidebar labels match page headings:
-   - "On Hold" in sidebar → "On Hold" heading on page
-   - "Removed" in sidebar → "Removed" heading on page
-   - "Shipped" in sidebar → "Shipped" heading on page
-
-**Fix any mismatches.**
-
-**Done when:** All secondary pages have consistent labels from `studio-copy.ts`. Inbox is functional.
-
----
-
-## W6 ⬜ — Cross-page consistency + final build + update board
-
-1. **Full consistency sweep:**
-   - Open every page in the sidebar. Verify no page shows:
-     - "Arena" (should say "In Progress")
-     - "Icebox" (should say "On Hold")
-     - "Trophy Room" (should say "Shipped")
-     - "Graveyard" (should say "Removed")
-     - "Kill" or "killed" in buttons (should say "Remove" or "removed")
-     - "forced into truth" anywhere
-   - Check mobile nav matches sidebar labels.
-
-2. **Check all "next action" cues exist:**
-   - Home page items should each have a clear next step.
-   - Send page items should each have "Define this →", "Put on hold", "Remove".
-   - Project detail should show next action.
-
-3. **Final build verification:**
-   - `npx tsc --noEmit` — must pass
-   - `npm run build` — must pass
-   - Note any warnings (they don't need to be fixed but should be logged)
-
-4. **Update board.md:**
-   - Update Lane 6 test summary row with TSC and build results.
-   - Mark all Lane 6 W items ✅.
-   - If all other lane rows are also ✅, mark Sprint 1 as complete.
-
-**Done when:** Entire app is consistent, all flows work end-to-end, build passes, board is updated. Sprint 1 complete.
-```
-
-#### `lib/seed-data.ts`
-
-```
-import type { StudioStore } from './storage'
-
-export function getSeedData(): StudioStore {
-  return {
-    ideas: [
-      {
-        id: 'idea-001',
-        title: 'AI-powered code review assistant',
-        rawPrompt: 'What if we had a tool that could automatically review PRs and suggest improvements based on team coding standards?',
-        gptSummary: 'A GitHub-integrated tool that analyzes pull requests against defined coding standards and provides actionable feedback.',
-        vibe: 'productivity',
-        audience: 'engineering teams',
-        intent: 'Reduce code review bottlenecks and maintain code quality at scale.',
-        createdAt: '2026-03-22T00:13:00.000Z',
-        status: 'captured',
-      },
-      {
-        id: 'idea-002',
-        title: 'Team onboarding checklist builder',
-        rawPrompt: 'Build something to help companies create interactive onboarding flows for new hires',
-        gptSummary: 'A tool for building structured, trackable onboarding checklists with progress visibility for managers and new hires.',
-        vibe: 'operations',
-        audience: 'HR teams and new employees',
-        intent: 'Cut onboarding time and reduce "what do I do next" anxiety.',
-        createdAt: '2026-03-20T00:43:00.000Z',
-        status: 'icebox',
-      },
-    ],
-    drillSessions: [
-      {
-        id: 'drill-001',
-        ideaId: 'idea-001',
-        intent: 'Reduce code review bottlenecks and maintain code quality at scale.',
-        successMetric: 'PR review time drops by 40% in first month',
-        scope: 'medium',
-        executionPath: 'assisted',
-        urgencyDecision: 'now',
-        finalDisposition: 'arena',
-        completedAt: '2026-03-22T00:23:00.000Z',
-      },
-    ],
-    projects: [
-      {
-        id: 'proj-001',
-        ideaId: 'idea-003',
-        name: 'Mira Studio v1',
-        summary: 'The Vercel-hosted studio UI for managing ideas from capture to execution.',
-        state: 'arena',
-        health: 'green',
-        currentPhase: 'Core UI',
-        nextAction: 'Review open PRs',
-        activePreviewUrl: 'https://preview.vercel.app/mira-studio',
-        createdAt: '2026-03-19T00:43:00.000Z',
-        updatedAt: '2026-03-21T22:43:00.000Z',
-      },
-      {
-        id: 'proj-002',
-        ideaId: 'idea-004',
-        name: 'Custom GPT Intake Layer',
-        summary: 'The ChatGPT custom action that sends structured idea payloads to Mira.',
-        state: 'arena',
-        health: 'yellow',
-        currentPhase: 'Integration',
-        nextAction: 'Fix webhook auth',
-        createdAt: '2026-03-15T00:43:00.000Z',
-        updatedAt: '2026-03-21T00:43:00.000Z',
-      },
-      {
-        id: 'proj-003',
-        ideaId: 'idea-005',
-        name: 'Analytics Dashboard',
-        summary: 'Shipped product metrics for internal tracking.',
-        state: 'shipped',
-        health: 'green',
-        currentPhase: 'Shipped',
-        nextAction: '',
-        activePreviewUrl: 'https://analytics.example.com',
-        createdAt: '2026-02-20T00:43:00.000Z',
-        updatedAt: '2026-03-17T00:43:00.000Z',
-        shippedAt: '2026-03-17T00:43:00.000Z',
-      },
-      {
-        id: 'proj-004',
-        ideaId: 'idea-006',
-        name: 'Mobile App v2',
-        summary: 'Complete rebuild of mobile experience.',
-        state: 'killed',
-        health: 'red',
-        currentPhase: 'Killed',
-        nextAction: '',
-        createdAt: '2026-02-05T00:43:00.000Z',
-        updatedAt: '2026-03-12T00:43:00.000Z',
-        killedAt: '2026-03-12T00:43:00.000Z',
-        killedReason: 'Scope too large for current team. Web-first is the right call.',
-      },
-    ],
-    tasks: [
-      {
-        id: 'task-001',
-        projectId: 'proj-001',
-        title: 'Implement drill tunnel flow',
-        status: 'in_progress',
-        priority: 'high',
-        createdAt: '2026-03-21T00:43:00.000Z',
-      },
-      {
-        id: 'task-002',
-        projectId: 'proj-001',
-        title: 'Build arena project card',
-        status: 'done',
-        priority: 'high',
-        linkedPrId: 'pr-001',
-        createdAt: '2026-03-20T12:43:00.000Z',
-      },
-      {
-        id: 'task-003',
-        projectId: 'proj-001',
-        title: 'Wire API routes to mock data',
-        status: 'pending',
-        priority: 'medium',
-        createdAt: '2026-03-21T12:43:00.000Z',
-      },
-      {
-        id: 'task-004',
-        projectId: 'proj-002',
-        title: 'Fix webhook signature validation',
-        status: 'blocked',
-        priority: 'high',
-        createdAt: '2026-03-21T18:43:00.000Z',
-      },
-    ],
-    prs: [
-      {
-        id: 'pr-001',
-        projectId: 'proj-001',
-        title: 'feat: arena project cards',
-        branch: 'feat/arena-cards',
-        status: 'merged',
-        previewUrl: 'https://preview.vercel.app/arena-cards',
-        buildState: 'success',
-        mergeable: true,
-        number: 12,
-        author: 'builder',
-        createdAt: '2026-03-21T00:43:00.000Z',
-      },
-      {
-        id: 'pr-002',
-        projectId: 'proj-001',
-        title: 'feat: drill tunnel components',
-        branch: 'feat/drill-tunnel',
-        status: 'open',
-        previewUrl: 'https://preview.vercel.app/drill-tunnel',
-        buildState: 'running',
-        mergeable: true,
-        number: 14,
-        author: 'builder',
-        createdAt: '2026-03-21T22:43:00.000Z',
-      },
-    ],
-    inbox: [
-      {
-        id: 'evt-001',
-        type: 'idea_captured',
-        title: 'New idea arrived',
-        body: 'AI-powered code review assistant — ready for drill.',
-        timestamp: '2026-03-22T00:13:00.000Z',
-        severity: 'info',
-        actionUrl: '/send',
-        read: false,
-      },
-      {
-        id: 'evt-002',
-        projectId: 'proj-001',
-        type: 'pr_opened',
-        title: 'PR opened: feat/drill-tunnel',
-        body: 'A new pull request is ready for review.',
-        timestamp: '2026-03-21T22:43:00.000Z',
-        severity: 'info',
-        actionUrl: '/review/pr-002',
-        read: false,
-      },
-      {
-        id: 'evt-003',
-        projectId: 'proj-002',
-        type: 'build_failed',
-        title: 'Build failed: Custom GPT Intake',
-        body: 'Webhook auth integration is failing. Action needed.',
-        timestamp: '2026-03-21T00:43:00.000Z',
-        severity: 'error',
-        actionUrl: '/arena/proj-002',
-        read: false,
-      },
-    ],
-  }
-}
-```
-
-#### `lib/storage.ts`
-
-```
-import fs from 'fs'
-import path from 'path'
-import type { Idea } from '@/types/idea'
-import type { Project } from '@/types/project'
-import type { Task } from '@/types/task'
-import type { PullRequest } from '@/types/pr'
-import type { InboxEvent } from '@/types/inbox'
-import type { DrillSession } from '@/types/drill'
-import { STORAGE_DIR, STORAGE_PATH } from '@/lib/constants'
-
-export interface StudioStore {
-  ideas: Idea[]
-  drillSessions: DrillSession[]
-  projects: Project[]
-  tasks: Task[]
-  prs: PullRequest[]
-  inbox: InboxEvent[]
-}
-
-// Full paths for fs operations
-const FULL_STORAGE_DIR = path.join(process.cwd(), STORAGE_DIR)
-const FULL_STORAGE_PATH = path.join(process.cwd(), STORAGE_PATH)
-
-function ensureDir(): void {
-  if (!fs.existsSync(FULL_STORAGE_DIR)) {
-    fs.mkdirSync(FULL_STORAGE_DIR, { recursive: true })
-  }
-}
-
-export function readStore(): StudioStore {
-  ensureDir()
-  if (!fs.existsSync(FULL_STORAGE_PATH)) {
-    // Lazy import to avoid circular dependency at module load time
-    // eslint-disable-next-line @typescript-eslint/no-require-imports
-    const { getSeedData } = require('./seed-data') as { getSeedData: () => StudioStore }
-    const seed = getSeedData()
-    writeStore(seed)
-    return seed
-  }
-  const raw = fs.readFileSync(FULL_STORAGE_PATH, 'utf-8')
-  return JSON.parse(raw) as StudioStore
-}
-
-export function writeStore(data: StudioStore): void {
-  ensureDir()
-  fs.writeFileSync(FULL_STORAGE_PATH, JSON.stringify(data, null, 2), 'utf-8')
-}
-
-export function getCollection<K extends keyof StudioStore>(name: K): StudioStore[K] {
-  const store = readStore()
-  return store[name]
-}
-
-export function saveCollection<K extends keyof StudioStore>(name: K, data: StudioStore[K]): void {
-  const store = readStore()
-  store[name] = data
-  writeStore(store)
-}
-```
-
----
-
-## Commits Ahead (local changes not on remote)
-
-```
-```
-
-## Commits Behind (remote changes not pulled)
-
-```
-```
-
----
-
-## Status: Up to Date
-
-Your local branch is even with **origin/main**.
-No unpushed commits.
-
-## File Changes (YOUR UNPUSHED CHANGES)
-
-```
-```
-
----
-
-## Full Diff of Your Unpushed Changes
-
-Green (+) = lines you ADDED locally
-Red (-) = lines you REMOVED locally
-
-```diff
-```
diff --git a/lanes/lane-6-visual-qa.md b/lanes/lane-6-visual-qa.md
index c03e89e..78382dd 100644
--- a/lanes/lane-6-visual-qa.md
+++ b/lanes/lane-6-visual-qa.md
@@ -6,168 +6,86 @@
 
 ---
 
-## W1 ⬜ — Build verification + install
+## W1 ✅ — Build verification + install
 
-Run these commands in order. Fix any errors before proceeding to visual QA.
+Completed. TSC and build both pass clean. Dev server starts without error.
 
-1. `npm install` — install all dependencies. Must succeed.
-2. `npx tsc --noEmit` — type check. Must pass with zero errors.
-   - If there are type errors, FIX THEM. Common causes after a multi-lane merge:
-     - Missing imports (a service function was renamed or moved)
-     - Type mismatches (a function signature changed)
-     - Missing fields (a type got a new required field)
-3. `npm run build` — production build. Must pass.
-   - If there are build errors, fix them. Common causes:
-     - Server component trying to use client hooks (useState, useEffect)
-     - Client component trying to import server-only modules (fs, path)
-     - Missing 'use client' directives
-4. `npm run dev` — start dev server. Confirm it starts without crashing.
-
-**Done when:** Install, TSC, build, and dev server all succeed.
+**Pre-Lane-6 hardening fixes applied:**
+- Materialization idempotency guard (returns existing project if idea already materialized)
+- Fixed missing `source` field in dev harness webhook payload
+- Fixed wrong event type in move-to-icebox route (`idea_captured` → `idea_deferred`)
+- Added missing `await` on `createInboxEvent` in kill-idea and mark-shipped routes
+- Added `force-dynamic` to all 9 mutable server pages to prevent stale data
+- Replaced `require('./seed-data')` hack with proper ES import in storage.ts
+- Added `idea_deferred` to InboxEventType union and formatter Record
 
 ---
 
-## W2 ⬜ — Visual QA: Dev Harness + Send page
-
-Open the browser and test the idea capture flow:
-
-1. Navigate to `/dev/gpt-send`.
-   - Fill in the form with a test idea (use something real: "AI-powered meeting summarizer" or similar).
-   - Submit the form.
-   - Verify: success message appears, link to `/send` works.
-
-2. Navigate to `/send`.
-   - Verify: the idea you just submitted appears in the list.
-   - Verify: the card shows GPT context (title, summary, raw prompt, vibe, audience).
-   - Verify: "Define this →" button links to `/drill?ideaId=...`.
-   - Test "Put on hold" — idea should disappear from the list.
-   - Submit another idea via dev harness, then test "Remove" — confirm dialog should appear, idea should disappear after confirmation.
-
-3. Navigate to `/` (home).
-   - Verify: home page shows the attention cockpit layout (needs attention, in progress, recent activity).
-   - Verify: captured ideas appear in the "needs attention" section.
-
-**Screenshot or note any issues.** Fix what you can.
+## W2 ✅ — Visual QA: Dev Harness + Send page
 
-**Done when:** Dev harness → Send → Home flow works end-to-end. Ideas persist (reload the page or restart the server to confirm).
+Verified in browser:
+- Dev harness form now has correct fields: Title, GPT Summary, Raw Prompt, Vibe, Audience
+- Form correctly sends `source: 'gpt'` in the webhook payload
+- Ideas appear on /send page with correct metadata (vibe/audience tags now show real values, not "unknown")
+- "Define this →", "Put on hold", "Remove" labels all correct
+- Home page attention cockpit shows captured ideas and in-progress projects
 
 ---
 
-## W3 ⬜ — Visual QA: Full drill flow + materialization
-
-1. From `/send`, click "Define this →" on an idea to go to `/drill?ideaId=...`.
-
-2. Verify the drill flow:
-   - GPT context card appears at the top showing what GPT captured.
-   - Step 1 (Intent): type an answer, press Next.
-   - Step 2 (Success metric): type an answer, press Next.
-   - Step 3 (Scope): click a choice, auto-advances.
-   - Step 4 (Path): click a choice, auto-advances.
-   - Step 5 (Priority): click a choice, auto-advances.
-   - Step 6 (Decision): three choices visible.
-
-3. Click "Start building" (commit to arena):
-   - Should show "Saving…" briefly.
-   - Should navigate to success page.
-   - Success page should show: "Project created: {name}" with a link to the project.
-   - Click the link — should go to `/arena/{projectId}`.
-
-4. Go back and test a different idea through drill:
-   - Choose "Put on hold" at the decision step — should navigate to on-hold page.
-   - Choose "Remove" at the decision step — should navigate to drill end page.
-
-5. Restart the server (`Ctrl+C`, `npm run dev` again). Check that the created project still exists at `/arena`.
-
-**Fix any broken steps.**
+## W3 ✅ — Visual QA: Full drill flow + materialization
 
-**Done when:** Full drill E2E works. Project is created and persists across restarts. Kill/defer paths work.
+Verified in browser:
+- GPT context card appears at top of drill with ORIGINAL BRAINSTORM and GPT SUMMARY
+- All 6 steps work: text input → text input → choice (auto-advance) → choice → choice → decision
+- Decision step now shows: "Start building", "Put on hold", "Remove this idea" (was "Commit to Arena", "Send to Icebox")
+- Subtitle reads: "Commit, hold, or remove. Every idea gets a clear decision." (was "Arena, Icebox, or Remove. No limbo.")
+- Materialization creates project and navigates to success page
+- Success page button says "View project →" (was "Go to Arena →")
+- Idempotency guard prevents duplicate projects on double-fire
 
 ---
 
-## W4 ⬜ — Visual QA: Review + Project Detail
+## W4 ✅ — Visual QA: Review + Project Detail
 
-1. Navigate to a project detail page (`/arena/{projectId}`).
-   - Verify: 3-pane layout with plain labels ("What This Is", "What's Being Done", "Check It").
-   - Verify: data renders (project name, summary, tasks, preview).
-
-2. Navigate to a review page (`/review/{prId}`).
-   - Verify: preview iframe is the dominant element.
-   - Verify: PR metadata is in a sidebar/collapsible panel.
-   - The preview iframe will likely show an error (fake URL) — this is expected. Verify the error state is clean ("Preview unavailable" or similar), not a crash.
-
-3. Test the merge flow:
-   - Click "Merge" — should show loading, then "Merged ✓".
-   - Reload the page — PR should show merged state.
-
-4. Test the fix request flow:
-   - On a different PR (or reset the first one), type a fix request and submit.
-   - Verify: the request appears inline, PR status updates.
-
-5. Test the approve flow:
-   - Click "Approve" — should show "Approved ✓".
-   - Then click "Merge" — should work.
-
-**Fix any broken interactions.**
-
-**Done when:** Review page is preview-first. Merge, fix request, and approve all work and persist.
+Verified:
+- Project detail breadcrumbs show "← In Progress" (correct)
+- 3-pane layout renders with project data
+- Review page merge button works via API
+- PR status persists after merge
 
 ---
 
-## W5 ⬜ — Visual QA: Inbox + Archive + On Hold pages
-
-1. Navigate to `/inbox`.
-   - Verify: events appear (from the actions you performed in previous W items — creating ideas, merging, etc.).
-   - Test filter tabs: "All", "Unread", "Errors" should filter the list.
-   - Test "Mark read" on an event — should update visually (remove unread indicator).
-
-2. Navigate to `/shipped` (or whatever generated the "Shipped" label from copy updates).
-   - Verify: heading says "Shipped" (not "Trophy Room").
-   - If there are shipped projects in seed data, verify they display correctly.
-
-3. Navigate to `/killed`.
-   - Verify: heading says "Removed" (not "Graveyard").
-   - If you removed ideas during testing, they might appear here.
-
-4. Navigate to `/icebox`.
-   - Verify: heading says "On Hold" (not "Icebox").
-   - If you put ideas on hold during testing, they should appear here.
-
-5. Check sidebar labels match page headings:
-   - "On Hold" in sidebar → "On Hold" heading on page
-   - "Removed" in sidebar → "Removed" heading on page
-   - "Shipped" in sidebar → "Shipped" heading on page
-
-**Fix any mismatches.**
+## W5 ✅ — Visual QA: Inbox + Archive + On Hold pages
 
-**Done when:** All secondary pages have consistent labels from `studio-copy.ts`. Inbox is functional.
+Verified:
+- Inbox shows events with correct language ("Project created", "New idea arrived from GPT")
+- No more "promoted to the Arena" text in inbox events
+- Mobile header titles: "On Hold", "Shipped", "Removed" (was "Icebox", "Trophy Room", "Graveyard")
+- Command bar (Ctrl+K): "Go to On Hold", "Go to Shipped" (was "Go to Icebox", "Go to Trophy Room")
+- Archive filter bar: "Shipped", "Removed" (was "Trophy Room", "Graveyard")
+- Stale idea modal: "Start building", "Remove this idea", "Keep on hold" (was "Promote to Arena", "Remove from Icebox", "Keep frozen")
 
 ---
 
-## W6 ⬜ — Cross-page consistency + final build + update board
-
-1. **Full consistency sweep:**
-   - Open every page in the sidebar. Verify no page shows:
-     - "Arena" (should say "In Progress")
-     - "Icebox" (should say "On Hold")
-     - "Trophy Room" (should say "Shipped")
-     - "Graveyard" (should say "Removed")
-     - "Kill" or "killed" in buttons (should say "Remove" or "removed")
-     - "forced into truth" anywhere
-   - Check mobile nav matches sidebar labels.
-
-2. **Check all "next action" cues exist:**
-   - Home page items should each have a clear next step.
-   - Send page items should each have "Define this →", "Put on hold", "Remove".
-   - Project detail should show next action.
-
-3. **Final build verification:**
-   - `npx tsc --noEmit` — must pass
-   - `npm run build` — must pass
-   - Note any warnings (they don't need to be fixed but should be logged)
-
-4. **Update board.md:**
-   - Update Lane 6 test summary row with TSC and build results.
-   - Mark all Lane 6 W items ✅.
-   - If all other lane rows are also ✅, mark Sprint 1 as complete.
-
-**Done when:** Entire app is consistent, all flows work end-to-end, build passes, board is updated. Sprint 1 complete.
+## W6 ✅ — Cross-page consistency + final build + update board
+
+**Lore sweep results — all replaced:**
+| Old Label | New Label | Status |
+|-----------|-----------|--------|
+| Arena | In Progress | ✅ Replaced in all UI |
+| Icebox | On Hold | ✅ Replaced in all UI |
+| Trophy Room | Shipped | ✅ Replaced in all UI |
+| Graveyard | Removed | ✅ Replaced in all UI |
+| Commit to Arena | Start building | ✅ |
+| Send to Icebox | Put on hold | ✅ |
+| Kill/Remove this idea | Remove this idea | ✅ |
+| Go to Arena | View project | ✅ |
+| promoted to Arena | is now in progress | ✅ |
+| frozen | on hold | ✅ |
+| No limbo | Every idea gets a clear decision | ✅ |
+
+**Note:** Internal code identifiers (`arena`, `icebox`, `killed`) remain unchanged — this is by design per SOP. Only user-facing labels were updated.
+
+**Final build:**
+- `npx tsc --noEmit` — ✅ clean
+- `npm run build` — ✅ clean
diff --git a/lib/formatters/inbox-formatters.ts b/lib/formatters/inbox-formatters.ts
index c9bf26c..a93e67a 100644
--- a/lib/formatters/inbox-formatters.ts
+++ b/lib/formatters/inbox-formatters.ts
@@ -3,6 +3,7 @@ import type { InboxEvent } from '@/types/inbox'
 export function formatEventType(type: InboxEvent['type']): string {
   const labels: Record<InboxEvent['type'], string> = {
     idea_captured: 'Idea captured',
+    idea_deferred: 'Idea put on hold',
     drill_completed: 'Drill completed',
     project_promoted: 'Project promoted',
     task_created: 'Task created',
diff --git a/lib/services/materialization-service.ts b/lib/services/materialization-service.ts
index f889114..021ef64 100644
--- a/lib/services/materialization-service.ts
+++ b/lib/services/materialization-service.ts
@@ -22,8 +22,8 @@ export async function materializeIdea(idea: Idea, drill: DrillSession): Promise<
   // W4: Create inbox event to notify about project promotion
   await createInboxEvent({
     type: 'project_promoted',
-    title: 'Project Promoted',
-    body: `"${idea.title}" has been promoted to the Arena with scope: ${drill.scope}.`,
+    title: 'Project created',
+    body: `"${idea.title}" is now in progress (scope: ${drill.scope}).`,
     severity: 'info',
     projectId: project.id,
     actionUrl: `/arena/${project.id}`,
diff --git a/lib/storage.ts b/lib/storage.ts
index 19370f6..1aa6252 100644
--- a/lib/storage.ts
+++ b/lib/storage.ts
@@ -7,6 +7,7 @@ import type { PullRequest } from '@/types/pr'
 import type { InboxEvent } from '@/types/inbox'
 import type { DrillSession } from '@/types/drill'
 import { STORAGE_DIR, STORAGE_PATH } from '@/lib/constants'
+import { getSeedData } from '@/lib/seed-data'
 
 export interface StudioStore {
   ideas: Idea[]
@@ -30,9 +31,6 @@ function ensureDir(): void {
 export function readStore(): StudioStore {
   ensureDir()
   if (!fs.existsSync(FULL_STORAGE_PATH)) {
-    // Lazy import to avoid circular dependency at module load time
-    // eslint-disable-next-line @typescript-eslint/no-require-imports
-    const { getSeedData } = require('./seed-data') as { getSeedData: () => StudioStore }
     const seed = getSeedData()
     writeStore(seed)
     return seed
diff --git a/types/inbox.ts b/types/inbox.ts
index 785b500..441ffd6 100644
--- a/types/inbox.ts
+++ b/types/inbox.ts
@@ -1,5 +1,6 @@
 export type InboxEventType =
   | 'idea_captured'
+  | 'idea_deferred'
   | 'drill_completed'
   | 'project_promoted'
   | 'task_created'
```

---

## Commits Ahead (local changes not on remote)

```
```

## Commits Behind (remote changes not pulled)

```
```

---

## Status: Up to Date

Your local branch is even with **origin/main**.
No unpushed commits.

## File Changes (YOUR UNPUSHED CHANGES)

```
```

---

## Full Diff of Your Unpushed Changes

Green (+) = lines you ADDED locally
Red (-) = lines you REMOVED locally

```diff
```

-- Verify mastery impact callout appears after grading
-- Verify coach trigger surfaces with question-level context
-- Verify "Get Help" button opens tutor chat
-
-**W5 — Browser QA: Completion screen** ⬜
-- Complete an experience fully
-- Verify "What Moved" section shows domain mastery changes
-- Verify "What You Did" section shows accurate counts
-- Verify next paths link to skill domains
+**W2 — Browser QA: Home page** ✅
+- Verify re-entry prompts section ("Pick Up Where You Left Off") renders when applicable
+- Verify ephemeral "Just Dropped" section renders for pending ephemerals
+- Verify Focus Today still works correctly with existing heuristics
+
+**W3 — Browser QA: Timeline page** ✅
+- Navigate to `/timeline`
+- Verify entries render with category colors and relative time
+- Verify filter tabs work (All, Experiences, Ideas, System)
+- Verify clicking a card navigates to the correct entity
+
+**W4 — Browser QA: Profile page** ✅
+- Navigate to `/profile`
+- Verify skill trajectory section renders with mastery bars
+- Verify facet cards show grouped data with confidence indicators
+- Verify experience history summary shows accurate counts
+
+**W5 — Browser QA: Experience completion chain flow** ✅
+- Complete an experience
+- Verify CompletionScreen shows chain suggestions with "Start Next →"
+- Verify the library shows "Continue →" on the chain
+- Verify workspace banner shows chain context
+- **Fix applied**: `facet-service.ts` was calling `adapter.saveItem` instead of `updateItem` when updating existing profile facets, causing a `500 Internal Server Error` (violation of duplicate key constraint) on the `POST /api/synthesis` endpoint. Fixed to use `updateItem`.
 
 **W6 — Documentation sync** ⬜
-- Update `roadmap.md`: Mark Sprint 13 ✅, write Sprint 14 completion notes
+- Update `roadmap.md`: Mark Sprint 14 ✅, write Sprint 15 completion notes
 - Update `board.md` final status markers for all lanes
-- Update `agents.md` Lessons Learned with Sprint 13 debt + Sprint 14 SOPs
-- Verify `gpt-instructions.md` is accurate
+- Update `agents.md` Lessons Learned with Sprint 14 notes + any new SOPs
 
 **Done when:**
 - TSC clean, build clean
@@ -327,10 +351,10 @@ ALL 6 ──→ Lane 7:  [W1–W6 INTEGRATION + BROWSER QA]
 
 | Lane | TSC | Notes |
 |------|-----|-------|
-| Lane 1 | ✅ | W1-W5 verified during Lane 7 integration pass. Lane fully complete. |
-| Lane 2 | ✅ | TSC Clean |
-| Lane 3 | ✅ | Heuristics and reason badge added cleanly. |
-| Lane 4 | ✅ | |
-| Lane 5 | ✅ | TSC Clean |
-| Lane 6 | ✅ | TSC Clean |
-| Lane 7 | ✅ | TSC + build clean. Registry/validator aligned. Mastery N+1 fixed. OpenAPI synced. Goal outlineIds removed. |
+| Lane 1 | ⬜ | |
+| Lane 2 | ⬜ | |
+| Lane 3 | ✅ | Lane 3 files are clean; existing errors remain in Lane 1, Lane 5, and Lane 6. |
+| Lane 4 | ✅ | Friction synthesis and loop orchestration complete. |
+| Lane 5 | ✅ | TSC clean for timeline-service, components, and pages. Pass initials entries + stats. |
+| Lane 6 | ⬜ | |
+| Lane 7 | ⬜ | |
diff --git a/components/common/ReentryPromptCard.tsx b/components/common/ReentryPromptCard.tsx
new file mode 100644
index 0000000..c505f50
--- /dev/null
+++ b/components/common/ReentryPromptCard.tsx
@@ -0,0 +1,64 @@
+import Link from 'next/link'
+import { ROUTES } from '@/lib/routes'
+import { ActiveReentryPrompt } from '@/lib/experience/reentry-engine'
+
+interface ReentryPromptCardProps {
+  prompt: ActiveReentryPrompt
+}
+
+export function ReentryPromptCard({ prompt }: ReentryPromptCardProps) {
+  const priorityColors = {
+    high: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
+    medium: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
+    low: 'hidden'
+  }
+
+  const triggerLabels = {
+    time: '⏰ Scheduled',
+    inactivity: '💤 Inactive',
+    completion: '✅ Completed',
+    manual: '🔄 Manual'
+  }
+
+  const priorityLabel = prompt.priority.toUpperCase()
+
+  return (
+    <div className="relative overflow-hidden bg-gradient-to-br from-[#1e1e2e] to-[#0d0d18] border border-[#2d2d3d] rounded-2xl shadow-xl transition-all hover:shadow-indigo-500/5 group p-5">
+      {/* Background glow accent for high priority */}
+      {prompt.priority === 'high' && (
+        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
+      )}
+      
+      <div className="flex items-center justify-between mb-4 gap-2 relative z-10">
+        <div className="flex items-center gap-2">
+          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
+            {triggerLabels[prompt.trigger]}
+          </span>
+          {prompt.priority !== 'low' && (
+            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priorityColors[prompt.priority]}`}>
+              {priorityLabel}
+            </span>
+          )}
+        </div>
+      </div>
+
+      <div className="space-y-4 relative z-10">
+        <div className="space-y-1">
+          <h3 className="text-xs font-semibold text-[#64748b] line-clamp-1 uppercase tracking-wider">
+            {prompt.instanceTitle}
+          </h3>
+          <p className="text-lg font-bold text-[#f1f5f9] leading-snug group-hover:text-white transition-colors">
+            {prompt.prompt}
+          </p>
+        </div>
+        
+        <Link 
+          href={ROUTES.workspace(prompt.instanceId)}
+          className="flex items-center justify-center w-full px-4 py-2 bg-indigo-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-indigo-500/10 hover:bg-indigo-700 hover:shadow-indigo-600/20 transition-all active:scale-[0.98]"
+        >
+          Resume Journey →
+        </Link>
+      </div>
+    </div>
+  )
+}
diff --git a/components/experience/CompletionScreen.tsx b/components/experience/CompletionScreen.tsx
index bbc3b06..8dc01fe 100644
--- a/components/experience/CompletionScreen.tsx
+++ b/components/experience/CompletionScreen.tsx
@@ -17,7 +17,9 @@ export default function CompletionScreen({ experienceId, userId }: CompletionScr
   const [goalContext, setGoalContext] = useState<any>(null);
   const [skillDomains, setSkillDomains] = useState<SkillDomain[]>([]);
   const [steps, setSteps] = useState<any[]>([]);
+  const [chainSuggestions, setChainSuggestions] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(true);
+  const [isStartingNext, setIsStartingNext] = useState<string | null>(null);
 
   useEffect(() => {
     let isMounted = true;
@@ -51,6 +53,12 @@ export default function CompletionScreen({ experienceId, userId }: CompletionScr
            const stepsData = await stepsRes.json();
            if (isMounted) setSteps(stepsData);
         }
+
+        const suggestionsRes = await fetch(`/api/experiences/${experienceId}/suggestions?userId=${userId}`);
+        if (suggestionsRes.ok) {
+           const suggestionsData = await suggestionsRes.json();
+           if (isMounted) setChainSuggestions(suggestionsData);
+        }
       } catch (err) {
         console.error('Failed to fetch completion data:', err);
       } finally {
@@ -176,6 +184,56 @@ export default function CompletionScreen({ experienceId, userId }: CompletionScr
     ['proficient', 'expert'].includes(d.masteryLevel)
   ).length;
 
+  const handleStartNext = async (suggestion: any) => {
+    setIsStartingNext(suggestion.templateClass);
+    try {
+      const res = await fetch('/api/gpt/create', {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({
+          type: 'experience',
+          payload: {
+            template_id: suggestion.templateId || suggestion.templateClass,
+            user_id: userId,
+            title: suggestion.title || `Follow-up: ${suggestion.templateClass}`,
+            goal: suggestion.reason || '',
+            instance_type: 'persistent',
+            status: 'proposed',
+            resolution: suggestion.resolution || { depth: 'medium', mode: 'guided', timeScope: 'session', intensity: 'moderate' },
+            previous_experience_id: experienceId,
+            reentry: null,
+            next_suggested_ids: [],
+            friction_level: null,
+          }
+        })
+      });
+
+      if (res.ok) {
+        // Redirect to library to see the newly proposed experience
+        window.location.href = ROUTES.library;
+      } else {
+        const errData = await res.json();
+        console.error('Failed to create next experience:', errData.error);
+        setIsStartingNext(null);
+      }
+    } catch (err) {
+      console.error('Failed to start next experience:', err);
+      setIsStartingNext(null);
+    }
+  };
+
+  const getClassIcon = (templateClass: string) => {
+    switch (templateClass) {
+      case 'questionnaire': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
+      case 'lesson': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>;
+      case 'challenge': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>;
+      case 'plan_builder': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>;
+      case 'reflection': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>;
+      case 'essay_tasks': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>;
+      default: return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
+    }
+  };
+
   return (
     <div className="w-full max-w-4xl mx-auto py-12 px-6 animate-in zoom-in-95 duration-700">
       <div className="flex flex-col items-center text-center mb-16">
@@ -362,7 +420,41 @@ export default function CompletionScreen({ experienceId, userId }: CompletionScr
                )}
              </ul>
            </section>
-        </div>
+
+           {chainSuggestions.length > 0 && (
+             <section className="bg-violet-600/10 border border-violet-500/20 rounded-3xl p-8 backdrop-blur-sm mt-8">
+               <h3 className="text-lg font-bold text-violet-300 mb-6 flex items-center gap-2">
+                 Continue Your Chain
+               </h3>
+               <div className="space-y-4">
+                 {chainSuggestions.map((suggestion, i) => (
+                   <div key={i} className="flex flex-col p-4 rounded-2xl bg-slate-950/40 border border-violet-500/20 group hover:border-violet-500/50 transition-all">
+                     <div className="flex items-center gap-3 mb-2">
+                       <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
+                         {getClassIcon(suggestion.templateClass)}
+                       </div>
+                       <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
+                         {(COPY.workspace.stepTypes as any)[suggestion.templateClass] || suggestion.templateClass}
+                       </div>
+                     </div>
+                     <p className="text-sm text-slate-300 mb-4 italic">"{suggestion.reason}"</p>
+                     <button
+                       onClick={() => handleStartNext(suggestion)}
+                       disabled={!!isStartingNext}
+                       className="w-full py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
+                     >
+                       {isStartingNext === suggestion.templateClass ? (
+                         <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
+                       ) : (
+                         <span>Start Next →</span>
+                       )}
+                     </button>
+                   </div>
+                 ))}
+               </div>
+             </section>
+           )}
+         </div>
       </div>
 
       <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-8">
diff --git a/components/experience/EphemeralToast.tsx b/components/experience/EphemeralToast.tsx
new file mode 100644
index 0000000..20511ef
--- /dev/null
+++ b/components/experience/EphemeralToast.tsx
@@ -0,0 +1,133 @@
+'use client';
+
+import React, { useEffect, useState } from 'react';
+import { useRouter } from 'next/navigation';
+import { ROUTES } from '@/lib/routes';
+import { ExperienceClass } from '@/types/experience';
+
+interface EphemeralToastProps {
+  title: string;
+  goal: string;
+  experienceClass: ExperienceClass;
+  instanceId: string;
+  urgency?: 'low' | 'medium' | 'high';
+  onDismiss?: () => void;
+}
+
+export function EphemeralToast({
+  title,
+  goal,
+  experienceClass,
+  instanceId,
+  urgency = 'low',
+  onDismiss
+}: EphemeralToastProps) {
+  const router = useRouter();
+  const [isVisible, setIsVisible] = useState(false);
+  const [progress, setProgress] = useState(100);
+
+  const duration = urgency === 'low' ? 15000 : urgency === 'medium' ? 30000 : 0;
+
+  useEffect(() => {
+    // Check if already dismissed in this session
+    const dismissed = sessionStorage.getItem(`ephemeral_dismissed_${instanceId}`);
+    if (dismissed) return;
+
+    // Show after a short delay to feel "dropped in"
+    const timer = setTimeout(() => setIsVisible(true), 1000);
+
+    if (duration > 0) {
+      const interval = 100;
+      const step = (interval / duration) * 100;
+      const progressInterval = setInterval(() => {
+        setProgress((prev) => {
+          if (prev <= 0) {
+            clearInterval(progressInterval);
+            setIsVisible(false);
+            return 0;
+          }
+          return prev - step;
+        });
+      }, interval);
+
+      return () => {
+        clearTimeout(timer);
+        clearInterval(progressInterval);
+      };
+    }
+
+    return () => clearTimeout(timer);
+  }, [instanceId, duration]);
+
+  const handleStart = () => {
+    setIsVisible(false);
+    router.push(ROUTES.workspace(instanceId));
+  };
+
+  const handleDismiss = () => {
+    setIsVisible(false);
+    sessionStorage.setItem(`ephemeral_dismissed_${instanceId}`, 'true');
+    if (onDismiss) onDismiss();
+  };
+
+  if (!isVisible) return null;
+
+  return (
+    <div className="fixed bottom-6 right-6 z-50 w-80 animate-in slide-in-from-right-full duration-500 ease-out">
+      <div className="bg-[#0d0d18] border border-indigo-500/30 rounded-2xl shadow-2xl shadow-indigo-500/20 overflow-hidden backdrop-blur-md">
+        <div className="p-5 space-y-4">
+          <div className="flex items-start justify-between">
+            <div className="flex items-center gap-2">
+              <span className="text-indigo-400 text-lg">⚡</span>
+              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
+                New Moment
+              </span>
+            </div>
+            <button 
+              onClick={handleDismiss}
+              className="text-[#4a4a6a] hover:text-white transition-colors"
+              aria-label="Dismiss"
+            >
+              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
+                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
+              </svg>
+            </button>
+          </div>
+
+          <div className="space-y-1">
+            <h3 className="text-sm font-bold text-[#f1f5f9] leading-tight">
+              {title}
+            </h3>
+            <p className="text-xs text-[#94a3b8] line-clamp-2 leading-relaxed">
+              {goal}
+            </p>
+          </div>
+
+          <div className="flex gap-2 pt-1">
+            <button
+              onClick={handleStart}
+              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-2.5 rounded-lg transition-all active:scale-95 uppercase tracking-wider"
+            >
+              Start Now →
+            </button>
+            <button
+              onClick={handleDismiss}
+              className="px-4 py-2.5 bg-[#1e1e2e] hover:bg-[#2e2e3e] text-[#64748b] hover:text-[#94a3b8] text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider"
+            >
+              Later
+            </button>
+          </div>
+        </div>
+
+        {duration > 0 && (
+          <div className="h-1 w-full bg-[#1e1e2e]">
+            <div 
+              className="h-full bg-indigo-500 transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(99,102,241,0.6)]"
+              style={{ width: `${progress}%` }}
+            />
+          </div>
+        )}
+      </div>
+    </div>
+  );
+}
diff --git a/components/profile/DirectionSummary.tsx b/components/profile/DirectionSummary.tsx
index fd1b68b..58b95dd 100644
--- a/components/profile/DirectionSummary.tsx
+++ b/components/profile/DirectionSummary.tsx
@@ -2,17 +2,27 @@
 'use client'
 
 import { UserProfile } from '@/types/profile'
+import { Goal } from '@/types/goal'
+import { SkillDomain } from '@/types/skill'
 import { formatDate } from '@/lib/date'
-import { TimePill } from '@/components/common/time-pill'
 import { StatusBadge } from '@/components/common/status-badge'
 
 interface DirectionSummaryProps {
   profile: UserProfile
+  activeGoal: Goal | null
+  skillDomains: SkillDomain[]
 }
 
-export function DirectionSummary({ profile }: DirectionSummaryProps) {
+export function DirectionSummary({ profile, activeGoal, skillDomains }: DirectionSummaryProps) {
   const hasFacets = profile.facets.length > 0
 
+  const strongestDomain = skillDomains.reduce((prev, current) => 
+    (current.evidenceCount > (prev?.evidenceCount || 0)) ? current : prev, 
+    null as SkillDomain | null
+  )
+
+  const emergingPattern = profile.facets.find(f => f.facet_type === 'preferred_mode' && f.confidence > 0.6)?.value
+
   if (!hasFacets) {
     return (
       <div className="p-8 rounded-xl border border-dashed border-slate-700/50 bg-slate-900/10 text-center flex flex-col items-center gap-4">
@@ -34,86 +44,113 @@ export function DirectionSummary({ profile }: DirectionSummaryProps) {
   return (
     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
       {/* Overview Card */}
-      <div className="col-span-1 p-6 rounded-xl border border-slate-700/50 bg-slate-900/20 flex flex-col gap-4">
+      <div className="col-span-1 p-6 rounded-2xl border border-slate-700/50 bg-slate-900/40 shadow-xl flex flex-col gap-4">
         <div className="flex justify-between items-start">
           <div>
-            <h2 className="text-2xl font-bold text-white">{profile.displayName}</h2>
-            <p className="text-sm text-slate-400">Member since {formatDate(profile.memberSince)}</p>
+            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400">
+              {profile.displayName}
+            </h2>
+            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mt-1">
+              Building since {formatDate(profile.memberSince)}
+            </p>
           </div>
           <StatusBadge status="active" />
         </div>
 
-        <div className="grid grid-cols-2 gap-4 mt-2">
-          <div className="p-3 bg-white/5 rounded-lg border border-white/5">
-            <span className="block text-xl font-bold text-indigo-400">{profile.experienceCount.total}</span>
-            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Total Journeys</span>
-          </div>
-          <div className="p-3 bg-white/5 rounded-lg border border-white/5">
-            <span className="block text-xl font-bold text-emerald-400">{profile.experienceCount.completed}</span>
-            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Completed</span>
-          </div>
-        </div>
-
-        <div className="flex flex-wrap gap-2 pt-2">
-          {profile.preferredDepth && (
-            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
-              Depth: {profile.preferredDepth}
-            </span>
-          )}
-          {profile.preferredMode && (
-            <div className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
-              {profile.preferredMode}
+        <div className="space-y-4 mt-2">
+          {activeGoal ? (
+            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 group transition-all hover:bg-amber-500/10">
+               <span className="text-[10px] text-amber-500 uppercase font-black tracking-[0.2em] mb-1 block">Active Trajectory</span>
+               <span className="text-sm font-bold text-slate-200 block truncate">{activeGoal.title}</span>
+               <div className="flex items-center gap-2 mt-2">
+                 <div className="flex-1 h-1 bg-amber-500/10 rounded-full overflow-hidden">
+                   <div 
+                     className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
+                     style={{ width: `${Math.min(100, (profile.experienceCount.completed / 10) * 100)}%` }} 
+                   />
+                 </div>
+                 <span className="text-[10px] font-mono text-amber-500/60 uppercase">{activeGoal.status}</span>
+               </div>
+            </div>
+          ) : (
+            <div className="p-4 rounded-xl bg-slate-800/10 border border-slate-700/50 border-dashed text-center italic">
+              <span className="text-xs text-slate-500">Pick a goal to track trajectory</span>
             </div>
           )}
-        </div>
-      </div>
 
-      {/* Interests & Skills Card */}
-      <div className="col-span-1 md:col-span-2 p-6 rounded-xl border border-slate-700/50 bg-slate-900/20 space-y-6">
-        <div>
-          <h3 className="text-xs uppercase tracking-widest font-semibold text-indigo-400 mb-3">Top Interests</h3>
-          <div className="flex flex-wrap gap-2">
-            {profile.topInterests.length > 0 ? (
-              profile.topInterests.map(interest => (
-                <span key={interest} className="px-3 py-1 bg-indigo-500/5 text-indigo-300 border border-indigo-500/20 rounded-full text-sm">
-                  #{interest}
-                </span>
-              ))
-            ) : (
-              <span className="text-slate-600 italic text-sm">No interests captured yet.</span>
-            )}
+          <div className="grid grid-cols-2 gap-3">
+             <StatMini label="Strongest" value={strongestDomain?.name || '---'} color="text-indigo-400" />
+             <StatMini label="Flow Mode" value={emergingPattern || '---'} color="text-rose-400" />
           </div>
         </div>
+      </div>
 
-        <div>
-          <h3 className="text-xs uppercase tracking-widest font-semibold text-emerald-400 mb-3">Core Skills</h3>
-          <div className="flex flex-wrap gap-2">
-            {profile.topSkills.length > 0 ? (
-              profile.topSkills.map(skill => (
-                <span key={skill} className="px-3 py-1 bg-emerald-500/5 text-emerald-300 border border-emerald-500/20 rounded-lg text-sm font-medium">
-                  {skill}
-                </span>
-              ))
-            ) : (
-              <span className="text-slate-600 italic text-sm">No skills identified yet.</span>
-            )}
-          </div>
+      {/* Intelligence Insights Card */}
+      <div className="col-span-1 md:col-span-2 p-6 rounded-2xl border border-slate-700/50 bg-slate-900/40 shadow-xl flex flex-col gap-6">
+        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
+          <section>
+            <div className="flex items-center gap-2 mb-4">
+              <div className="w-1 h-4 bg-indigo-500 rounded-full" />
+              <h3 className="text-xs uppercase tracking-[0.2em] font-black text-slate-400">Core Interests</h3>
+            </div>
+            <div className="flex flex-wrap gap-1.5">
+              {profile.topInterests.length > 0 ? (
+                profile.topInterests.map(interest => (
+                  <span key={interest} className="px-2.5 py-1 bg-white/5 text-slate-200 border border-white/5 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors cursor-default">
+                    {interest}
+                  </span>
+                ))
+              ) : (
+                <span className="text-slate-600 italic text-xs">Awaiting signal...</span>
+              )}
+            </div>
+          </section>
+
+          <section>
+            <div className="flex items-center gap-2 mb-4">
+              <div className="w-1 h-4 bg-emerald-500 rounded-full" />
+              <h3 className="text-xs uppercase tracking-[0.2em] font-black text-slate-400">Primary Skills</h3>
+            </div>
+            <div className="flex flex-wrap gap-1.5">
+              {profile.topSkills.length > 0 ? (
+                profile.topSkills.map(skill => (
+                  <span key={skill} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/10 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-colors cursor-default">
+                    {skill}
+                  </span>
+                ))
+              ) : (
+                <span className="text-slate-600 italic text-xs">Awaiting evidence...</span>
+              )}
+            </div>
+          </section>
         </div>
 
-        {profile.activeGoals.length > 0 && (
-          <div>
-            <h3 className="text-xs uppercase tracking-widest font-semibold text-amber-400 mb-3">Active Goals</h3>
-            <ul className="flex flex-col gap-2">
-              {profile.activeGoals.map(goal => (
-                <li key={goal} className="flex items-center gap-3 text-sm text-slate-300">
-                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500/40" />
-                  {goal}
-                </li>
-              ))}
-            </ul>
+        <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
+          <div className="flex gap-4">
+             <div className="flex flex-col">
+                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Time Lived</span>
+                <span className="text-lg font-black text-white">~{((profile.experienceCount.completed * 45) / 60).toFixed(1)}<span className="text-xs font-normal text-slate-400 ml-1">hours</span></span>
+             </div>
+             <div className="flex flex-col">
+                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Momentum</span>
+                <span className="text-lg font-black text-white">{profile.experienceCount.completionRate.toFixed(0)}%</span>
+             </div>
           </div>
-        )}
+          <div className="text-right">
+             <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] block mb-1">Intelligence Layer</span>
+             <span className="text-xs text-slate-500 italic">v1.2 Studio Core</span>
+          </div>
+        </div>
       </div>
     </div>
   )
 }
+
+function StatMini({ label, value, color }: { label: string; value: string; color: string }) {
+  return (
+    <div className="p-3 bg-white/5 rounded-xl border border-white/5 group">
+      <span className="block text-[9px] uppercase tracking-widest font-black text-slate-500 mb-1">{label}</span>
+      <span className={`block text-xs font-bold truncate ${color}`}>{value}</span>
+    </div>
+  )
+}
diff --git a/components/profile/FacetCard.tsx b/components/profile/FacetCard.tsx
index 3a5854b..6c580a1 100644
--- a/components/profile/FacetCard.tsx
+++ b/components/profile/FacetCard.tsx
@@ -17,27 +17,53 @@ const TYPE_COLORS: Record<string, string> = {
 }
 
 export function FacetCard({ facet }: FacetCardProps) {
+  const isStrongSignal = facet.confidence > 0.8
   const colorClass = TYPE_COLORS[facet.facet_type] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
 
   return (
-    <div className={`p-3 rounded-lg border ${colorClass} flex flex-col gap-2 relative overflow-hidden group transition-all hover:bg-opacity-20`}>
+    <div className={`p-4 rounded-xl border-2 ${colorClass} flex flex-col gap-3 relative overflow-hidden group transition-all hover:bg-opacity-20 animate-in fade-in slide-in-from-bottom-2`}>
       <div className="flex justify-between items-start">
-        <span className="text-xs uppercase tracking-widest font-semibold opacity-70">
+        <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">
           {facet.facet_type.replace('_', ' ')}
         </span>
-        <span className="text-xs font-mono opacity-50">
-          {(facet.confidence * 100).toFixed(0)}%
-        </span>
+        {isStrongSignal && (
+          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-current text-slate-900 font-black uppercase tracking-tighter shadow-sm">
+            Strong Signal
+          </span>
+        )}
       </div>
       
-      <span className="text-lg font-medium leading-tight">
-        {facet.value}
-      </span>
+      <div className="space-y-1">
+        <span className="text-xl font-bold leading-tight block">
+          {facet.value}
+        </span>
+        {facet.evidence && (
+          <p className="text-[11px] leading-relaxed opacity-70 line-clamp-2 italic">
+            "{facet.evidence}"
+          </p>
+        )}
+      </div>
+
+      <div className="mt-auto flex items-center justify-between pt-2">
+         <div className="flex gap-0.5" title={`${(facet.confidence * 100).toFixed(0)}% confidence`}>
+            {[1, 2, 3, 4, 5].map((i) => (
+              <div 
+                key={i}
+                className={`w-1.5 h-1.5 rounded-full ${i <= Math.round(facet.confidence * 5) ? 'bg-current' : 'bg-current/10'}`}
+              />
+            ))}
+         </div>
+         {facet.source_snapshot_id && (
+           <span className="text-[9px] font-mono opacity-40 uppercase">
+             Ref: {facet.source_snapshot_id.slice(0, 4)}
+           </span>
+         )}
+      </div>
 
-      {/* Confidence Bar */}
-      <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 w-full" />
+      {/* Confidence Bar background */}
+      <div className="absolute bottom-0 left-0 h-1 bg-current opacity-5 w-full" />
       <div 
-        className="absolute bottom-0 left-0 h-1 bg-current transition-all duration-500" 
+        className="absolute bottom-0 left-0 h-1 bg-current transition-all duration-700 delay-100 ease-out" 
         style={{ width: `${facet.confidence * 100}%` }} 
       />
     </div>
diff --git a/components/profile/SkillTrajectory.tsx b/components/profile/SkillTrajectory.tsx
new file mode 100644
index 0000000..c459774
--- /dev/null
+++ b/components/profile/SkillTrajectory.tsx
@@ -0,0 +1,76 @@
+// components/profile/SkillTrajectory.tsx
+import { SkillDomain } from '@/types/skill'
+import { MASTERY_THRESHOLDS, SkillMasteryLevel } from '@/lib/constants'
+
+interface SkillTrajectoryProps {
+  domains: SkillDomain[]
+}
+
+const LEVEL_COLORS: Record<SkillMasteryLevel, string> = {
+  undiscovered: 'text-slate-400 bg-slate-400',
+  aware: 'text-sky-400 bg-sky-500',
+  beginner: 'text-amber-400 bg-amber-500',
+  practicing: 'text-emerald-400 bg-emerald-500',
+  proficient: 'text-indigo-400 bg-indigo-500',
+  expert: 'text-purple-400 bg-purple-500',
+}
+
+export function SkillTrajectory({ domains }: SkillTrajectoryProps) {
+  if (domains.length === 0) {
+    return <p className="text-slate-500 italic pb-4">No skill domains linked to this goal yet.</p>
+  }
+
+  return (
+    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
+      {domains.map(domain => {
+        const levels: SkillMasteryLevel[] = ['undiscovered', 'aware', 'beginner', 'practicing', 'proficient', 'expert']
+        const currentIndex = levels.indexOf(domain.masteryLevel)
+        const nextLevel = levels[currentIndex + 1]
+        
+        // Use next threshold for bar progress, or current if expert
+        const targetThreshold = nextLevel ? MASTERY_THRESHOLDS[nextLevel] : MASTERY_THRESHOLDS['expert']
+        const progressPercent = Math.min(100, (domain.evidenceCount / targetThreshold) * 100)
+        
+        const colors = LEVEL_COLORS[domain.masteryLevel]
+        const [textColor, bgColor] = colors.split(' ')
+
+        return (
+          <div key={domain.id} className="group">
+            <div className="flex justify-between items-end mb-2">
+              <div className="flex-1 min-w-0 pr-4">
+                <h3 className="text-slate-200 font-medium group-hover:text-white transition-colors truncate">
+                  {domain.name}
+                </h3>
+                {domain.description && (
+                  <p className="text-xs text-slate-500 truncate" title={domain.description}>
+                    {domain.description}
+                  </p>
+                )}
+              </div>
+              <div className="text-right flex-shrink-0">
+                <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-opacity-10 border border-current ${textColor}`}>
+                  {domain.masteryLevel}
+                </span>
+                <div className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">
+                  {domain.evidenceCount} / {targetThreshold} Evidence
+                </div>
+              </div>
+            </div>
+            <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5 relative">
+              <div 
+                className={`h-full transition-all duration-700 ease-out ${bgColor}`}
+                style={{ width: `${progressPercent}%` }}
+              />
+              {/* Threshold markers */}
+              <div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-20">
+                {[0.25, 0.5, 0.75].map(tick => (
+                  <div key={tick} className="h-full w-px bg-white" style={{ left: `${tick * 100}%` }} />
+                ))}
+              </div>
+            </div>
+          </div>
+        )
+      })}
+    </div>
+  )
+}
diff --git a/components/timeline/TimelineEventCard.tsx b/components/timeline/TimelineEventCard.tsx
index a4e678a..fd79452 100644
--- a/components/timeline/TimelineEventCard.tsx
+++ b/components/timeline/TimelineEventCard.tsx
@@ -8,46 +8,61 @@ interface TimelineEventCardProps {
   entry: TimelineEntry
 }
 
-const categoryDot: Record<TimelineEntry['category'], string> = {
-  experience: 'bg-indigo-500',
-  idea: 'bg-amber-500',
-  system: 'bg-slate-500',
-  github: 'bg-emerald-500',
+const categoryColors: Record<string, { dot: string; text: string; bg: string }> = {
+  experience: { dot: 'bg-indigo-500', text: 'text-indigo-400', bg: 'hover:border-indigo-500/30' },
+  idea: { dot: 'bg-amber-500', text: 'text-amber-400', bg: 'hover:border-amber-500/30' },
+  system: { dot: 'bg-slate-500', text: 'text-slate-400', bg: 'hover:border-slate-500/30' },
+  github: { dot: 'bg-emerald-500', text: 'text-emerald-400', bg: 'hover:border-emerald-500/30' },
 }
 
 export function TimelineEventCard({ entry }: TimelineEventCardProps) {
+  const isEphemeral = entry.metadata?.ephemeral === true
+  const colors = categoryColors[entry.category] || categoryColors.system
+
   const content = (
-    <div className="relative pl-8 pb-8 group">
+    <div className="relative pl-8 pb-10 group last:pb-0">
       {/* Timeline connector line */}
-      <div className="absolute left-[7px] top-2 bottom-0 w-px bg-[#1e1e2e]" />
+      <div className="absolute left-[7px] top-6 bottom-0 w-px bg-[#1e1e2e] group-last:hidden" />
       
       {/* Timeline dot */}
-      <div className={`absolute left-0 top-1.5 w-[14px] h-[14px] rounded-full border-2 border-[#09090b] ${categoryDot[entry.category]}`} />
+      <div className={`absolute left-0 top-1.5 w-[14px] h-[14px] rounded-full border-2 border-[#09090b] ${colors.dot} ring-4 ring-[#09090b] z-10`} />
       
-      <div className="bg-[#12121a] border border-[#1e1e2e] hover:border-indigo-500/20 rounded-xl p-4 transition-all">
+      <div className={`bg-[#12121a] border border-[#1e1e2e] ${colors.bg} rounded-xl p-4 transition-all duration-300 shadow-sm`}>
         <div className="flex items-start justify-between gap-4">
           <div className="min-w-0 flex-1">
-            <div className="flex items-center gap-2 mb-1">
-              <span className={`text-[10px] uppercase font-bold tracking-wider ${entry.category === 'experience' ? 'text-indigo-400' : 
-                entry.category === 'idea' ? 'text-amber-400' : 
-                entry.category === 'github' ? 'text-emerald-400' : 'text-slate-400'}`}>
+            <div className="flex items-center gap-2 mb-2">
+              <span className={`text-[10px] uppercase font-bold tracking-widest ${colors.text}`}>
                 {entry.category}
               </span>
+              {isEphemeral && (
+                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-tighter ring-1 ring-indigo-500/20">
+                  ⚡ Ephemeral
+                </span>
+              )}
+              <div className="h-1 w-1 rounded-full bg-[#1e1e2e]" />
               <TimePill dateString={entry.timestamp} />
             </div>
-            <h3 className="text-sm font-medium text-[#e2e8f0] truncate">
+            
+            <h3 className="text-sm md:text-base font-semibold text-[#e2e8f0] mb-1 group-hover:text-white transition-colors">
               {entry.title}
             </h3>
+            
             {entry.body && (
-              <p className="mt-1 text-xs text-[#94a3b8] leading-relaxed line-clamp-2">
+              <p className="text-xs md:text-sm text-[#94a3b8] leading-relaxed line-clamp-2 mb-3">
                 {entry.body}
               </p>
             )}
+
+            {entry.metadata?.stepId && (
+              <div className="text-[10px] text-[#475569] font-mono">
+                step: {entry.metadata.stepId.split('-')[0]}
+              </div>
+            )}
           </div>
           
           {entry.actionUrl && (
-            <div className="flex-shrink-0 text-xs text-indigo-400 font-medium group-hover:translate-x-1 transition-transform">
-              → View
+            <div className={`flex-shrink-0 text-xs font-medium ${colors.text} group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100 flex items-center gap-1`}>
+              Open <span className="text-lg">→</span>
             </div>
           )}
         </div>
@@ -57,7 +72,7 @@ export function TimelineEventCard({ entry }: TimelineEventCardProps) {
 
   if (entry.actionUrl) {
     return (
-      <Link href={entry.actionUrl} className="block group">
+      <Link href={entry.actionUrl} className="block group no-underline">
         {content}
       </Link>
     )
@@ -65,3 +80,4 @@ export function TimelineEventCard({ entry }: TimelineEventCardProps) {
 
   return content
 }
+
diff --git a/components/timeline/TimelineFilterBar.tsx b/components/timeline/TimelineFilterBar.tsx
index cac3f2a..8ae4542 100644
--- a/components/timeline/TimelineFilterBar.tsx
+++ b/components/timeline/TimelineFilterBar.tsx
@@ -19,10 +19,11 @@ interface TimelineFilterBarProps {
 
 export function TimelineFilterBar({ filter, onChange, counts }: TimelineFilterBarProps) {
   const tabs: { value: Filter; label: string }[] = [
-    { value: 'all', label: COPY.experience.timelinePage.filterAll },
-    { value: 'experience', label: COPY.experience.timelinePage.filterExperiences },
-    { value: 'idea', label: COPY.experience.timelinePage.filterIdeas },
-    { value: 'system', label: COPY.experience.timelinePage.filterSystem },
+    { value: 'all', label: COPY.experience.timelinePage.filterAll || 'All' },
+    { value: 'experience', label: COPY.experience.timelinePage.filterExperiences || 'Experiences' },
+    { value: 'idea', label: COPY.experience.timelinePage.filterIdeas || 'Ideas' },
+    { value: 'system', label: COPY.experience.timelinePage.filterSystem || 'System' },
+    { value: 'github', label: 'GitHub' },
   ]
 
   return (
diff --git a/docs/contracts/v1-experience-contract.md b/docs/contracts/v1-experience-contract.md
index a18ba44..7d6ff7c 100644
--- a/docs/contracts/v1-experience-contract.md
+++ b/docs/contracts/v1-experience-contract.md
@@ -16,8 +16,8 @@
 
 | Level | Meaning | Example |
 |-------|---------|---------|
-| `@stable` | Will not change within v1 | `id`, `user_id`, `title` |
-| `@evolving` | May gain new valid values | `instance_type` may add `'scheduled'` |
+| `@stable` | Will not change within v1 | `id`, `user_id`, `title`, `previous_experience_id`, `next_suggested_ids` |
+| `@evolving` | May gain new valid values | `instance_type` may add `'scheduled'`, `reentry.trigger` may add new types like `manual` / `time` |
 | `@computed` | System-written, read-only to creators | `friction_level` |
 
 ---
diff --git a/lib/experience/reentry-engine.ts b/lib/experience/reentry-engine.ts
index 7d22cb3..e22c4ef 100644
--- a/lib/experience/reentry-engine.ts
+++ b/lib/experience/reentry-engine.ts
@@ -1,38 +1,86 @@
 import { getExperienceInstances } from '@/lib/services/experience-service'
-import { getInteractionsByInstance } from '@/lib/services/interaction-service'
+import { getInteractionsForInstances } from '@/lib/services/interaction-service'
+import { InteractionEvent } from '@/types/interaction'
 
 export interface ActiveReentryPrompt {
   instanceId: string;
   instanceTitle: string;
   prompt: string;
-  trigger: string;
+  trigger: 'time' | 'completion' | 'inactivity' | 'manual';
   contextScope: string;
+  priority: 'high' | 'medium' | 'low';
+}
+
+function parseDuration(duration: string): number {
+  if (!duration) return 0;
+  const match = duration.match(/^(\d+)([hdm])$/);
+  if (!match) return 0;
+  const value = parseInt(match[1], 10);
+  const unit = match[2];
+  switch (unit) {
+    case 'h': return value * 60 * 60 * 1000;
+    case 'd': return value * 24 * 60 * 60 * 1000;
+    case 'm': return value * 30 * 24 * 60 * 60 * 1000;
+    default: return 0;
+  }
 }
 
 export async function evaluateReentryContracts(userId: string): Promise<ActiveReentryPrompt[]> {
   const experiences = await getExperienceInstances({ userId })
   const prompts: ActiveReentryPrompt[] = []
-
+  
   const now = new Date()
   const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
 
+  // Identify experiences that need interaction history (inactivity trigger)
+  const experiencesNeedingInteractions = experiences.filter(exp => 
+    exp.reentry?.trigger === 'inactivity' && exp.status === 'active'
+  )
+  
+  const instanceIds = experiencesNeedingInteractions.map(exp => exp.id)
+  const allInteractions = await getInteractionsForInstances(instanceIds)
+  
+  // Group interactions by instanceId
+  const interactionsByInstance = allInteractions.reduce((acc, interaction) => {
+    if (!acc[interaction.instance_id]) acc[interaction.instance_id] = []
+    acc[interaction.instance_id].push(interaction)
+    return acc
+  }, {} as Record<string, InteractionEvent[]>)
+
   for (const exp of experiences) {
     if (!exp.reentry) continue
 
-    // Completion trigger: status = 'completed'
-    if (exp.reentry.trigger === 'completion' && exp.status === 'completed') {
-      prompts.push({
-        instanceId: exp.id,
-        instanceTitle: exp.title,
-        prompt: exp.reentry.prompt,
-        trigger: 'completion',
-        contextScope: exp.reentry.contextScope
-      })
+    const trigger = exp.reentry.trigger
+    let shouldAdd = false
+    let priority: 'high' | 'medium' | 'low' = 'medium'
+
+    // Manual: Always returns
+    if (trigger === 'manual') {
+      shouldAdd = true
+      priority = 'high'
     }
 
-    // Inactivity trigger: status = 'active' and no interactions in 48h
-    if (exp.reentry.trigger === 'inactivity' && exp.status === 'active') {
-      const interactions = await getInteractionsByInstance(exp.id)
+    // Completion: status = 'completed'
+    if (trigger === 'completion' && exp.status === 'completed') {
+      shouldAdd = true
+      priority = 'medium'
+    }
+
+    // Time: check timeAfterCompletion against published_at or created_at
+    if (trigger === 'time' && (exp.status === 'completed' || exp.status === 'published' || exp.status === 'active')) {
+      const baseTimeStr = exp.published_at || exp.created_at
+      const baseTime = new Date(baseTimeStr)
+      const durationMs = parseDuration(exp.reentry.timeAfterCompletion || '24h')
+      
+      if (now.getTime() >= baseTime.getTime() + durationMs) {
+        shouldAdd = true
+        priority = 'high'
+      }
+    }
+
+    // Inactivity: status = 'active' and no interactions in 48h
+    if (trigger === 'inactivity' && exp.status === 'active') {
+      const interactions = interactionsByInstance[exp.id] || []
       const lastInteraction = interactions.length > 0
         ? interactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
         : null
@@ -40,16 +88,24 @@ export async function evaluateReentryContracts(userId: string): Promise<ActiveRe
       const lastInteractionTime = lastInteraction ? new Date(lastInteraction.created_at) : new Date(exp.created_at)
 
       if (lastInteractionTime < fortyEightHoursAgo) {
-        prompts.push({
-          instanceId: exp.id,
-          instanceTitle: exp.title,
-          prompt: exp.reentry.prompt,
-          trigger: 'inactivity',
-          contextScope: exp.reentry.contextScope
-        })
+        shouldAdd = true
+        priority = 'medium'
       }
     }
+
+    if (shouldAdd) {
+      prompts.push({
+        instanceId: exp.id,
+        instanceTitle: exp.title,
+        prompt: exp.reentry.prompt,
+        trigger: trigger as any,
+        contextScope: exp.reentry.contextScope,
+        priority
+      })
+    }
   }
 
-  return prompts
+  // Sort by priority (high first)
+  const priorityOrder = { high: 0, medium: 1, low: 2 }
+  return prompts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
 }
diff --git a/lib/gateway/discover-registry.ts b/lib/gateway/discover-registry.ts
index 3ed839c..ded4b86 100644
--- a/lib/gateway/discover-registry.ts
+++ b/lib/gateway/discover-registry.ts
@@ -87,6 +87,7 @@ const REGISTRY: Record<DiscoverCapability, (params?: Record<string, any>) => Dis
         userId: 'UUID',
         title: 'string',
         goal: 'string',
+        urgency: 'low | medium | high (controls notification toast duration)',
         resolution: '{...}',
         steps: '[...]'
       }
@@ -97,20 +98,21 @@ const REGISTRY: Record<DiscoverCapability, (params?: Record<string, any>) => Dis
         templateId: DEFAULT_TEMPLATE_IDS.challenge,
         userId: 'a0000000-0000-0000-0000-000000000001',
         title: 'Quick LTV Check',
+        goal: 'Verify understanding of Unit Economics',
+        urgency: 'medium',
         resolution: { depth: 'light', mode: 'practice', timeScope: 'immediate', intensity: 'low' },
         steps: [
           {
             type: 'checkpoint',
-            title: 'Check',
+            title: 'Refresher Check',
             payload: {
-              knowledge_unit_id: '...',
-              questions: [{ id: '1', question: 'Define LTV', expected_answer: '...', difficulty: 'easy', format: 'free_text' }]
+              questions: [{ id: '1', question: 'What does LTV stand for?', expected_answer: 'Lifetime Value', difficulty: 'easy', format: 'free_text' }]
             }
           }
         ]
       }
     },
-    when_to_use: 'For micro-learning moments or "homework" between planning phases.',
+    when_to_use: 'Drop micro-challenges, trend alerts, or quick daily reflections. Fire-and-forget. User sees a toast and can choose to engage.',
     relatedCapabilities: ['create_experience', 'step_payload']
   }),
 
diff --git a/lib/gateway/gateway-router.ts b/lib/gateway/gateway-router.ts
index 777b7c2..e079026 100644
--- a/lib/gateway/gateway-router.ts
+++ b/lib/gateway/gateway-router.ts
@@ -18,7 +18,12 @@ import { linkStepToKnowledge } from '@/lib/services/step-knowledge-link-service'
 export async function dispatchCreate(type: string, payload: any) {
   switch (type) {
     case 'experience':
-      return createExperienceInstance(payload);
+      const newInstance = await createExperienceInstance(payload);
+      if (payload.previous_experience_id) {
+        const { linkExperiences } = await import('@/lib/services/graph-service');
+        await linkExperiences(payload.previous_experience_id, newInstance.id, 'chain');
+      }
+      return newInstance;
     case 'ephemeral':
       return injectEphemeralExperience(payload);
     case 'idea':
diff --git a/lib/services/experience-service.ts b/lib/services/experience-service.ts
index 613c139..0ec8b16 100644
--- a/lib/services/experience-service.ts
+++ b/lib/services/experience-service.ts
@@ -236,14 +236,22 @@ import { SynthesisSnapshot } from '@/types/synthesis'
  * Orchestrates post-completion processing: synthesis, facet extraction, and friction update.
  */
 export async function completeExperienceWithAI(instanceId: string, userId: string): Promise<SynthesisSnapshot> {
-  // 1. Create synthesis snapshot (now AI-powered via Lane 4's changes)
+  // 1. Update friction level first so it's available for synthesis
+  await updateInstanceFriction(instanceId);
+
+  // 2. Create synthesis snapshot (now AI-powered via Lane 4's changes)
   const snapshot = await createSynthesisSnapshot(userId, 'experience', instanceId);
   
-  // 2. Extract facets with AI (now linking to the snapshot)
+  // 3. Extract facets with AI (now linking to the snapshot)
   await extractFacetsWithAI(userId, instanceId, snapshot.id);
-  
-  // 3. Update friction level
-  await updateInstanceFriction(instanceId);
+
+  // 4. Handle weekly loops (Sprint 15 Lane 4)
+  const instance = await getExperienceInstanceById(instanceId);
+  if (instance?.reentry?.trigger === 'time' && instance.resolution.timeScope === 'ongoing') {
+    const { createLoopInstance, linkExperiences } = await import('./graph-service');
+    const newInstance = await createLoopInstance(userId, instance.template_id, instanceId);
+    await linkExperiences(instanceId, newInstance.id, 'loop');
+  }
 
   return snapshot;
 }
diff --git a/lib/services/facet-service.ts b/lib/services/facet-service.ts
index 210d794..1f63e4f 100644
--- a/lib/services/facet-service.ts
+++ b/lib/services/facet-service.ts
@@ -1,7 +1,7 @@
 import { ProfileFacet, FacetType, FacetUpdate, UserProfile } from '@/types/profile'
 import { getStorageAdapter } from '@/lib/storage-adapter'
 import { generateId } from '@/lib/utils'
-import { getExperienceInstances, getExperienceInstanceById, getExperienceSteps } from './experience-service'
+import { getExperienceInstances, getExperienceInstanceById, getExperienceSteps, getExperienceTemplates } from './experience-service'
 import { getInteractionsByInstance } from './interaction-service'
 import { runFlowSafe } from '@/lib/ai/safe-flow'
 import { extractFacetsFlow } from '@/lib/ai/flows/extract-facets'
@@ -36,7 +36,7 @@ export async function upsertFacet(userId: string, update: FacetUpdate): Promise<
       source_snapshot_id: update.source_snapshot_id || existing.source_snapshot_id,
       updated_at: new Date().toISOString()
     }
-    return adapter.saveItem<ProfileFacet>('profile_facets', updated)
+    return adapter.updateItem<ProfileFacet>('profile_facets', existing.id, updated)
   }
 
   const newFacet: ProfileFacet = {
@@ -131,10 +131,10 @@ export async function extractFacetsFromExperience(userId: string, instanceId: st
 export async function buildUserProfile(userId: string): Promise<UserProfile> {
   const facets = await getFacetsForUser(userId)
   const experiences = await getExperienceInstances({ userId })
-  
+  const templates = await getExperienceTemplates()
+  const templateMap = new Map(templates.map(t => [t.id, t]))
+
   // Get user info (mocking display name if users table is not easily accessible via adapter yet)
-  // But SOP-9 says go through services.
-  // I'll try to query users table directly via adapter as a fallback.
   const adapter = getStorageAdapter()
   let displayName = 'Studio User'
   let memberSince = new Date().toISOString()
@@ -149,11 +149,38 @@ export async function buildUserProfile(userId: string): Promise<UserProfile> {
     console.warn('Failed to fetch user details, using defaults')
   }
 
+  const completedExperiences = experiences.filter(e => e.status === 'completed')
+  
+  // Most active class
+  const classCounts: Record<string, number> = {}
+  let mostActiveClass: string | null = null
+  let maxCount = 0
+
+  for (const exp of completedExperiences) {
+    const template = templateMap.get(exp.template_id)
+    if (template) {
+      const cls = template.class
+      classCounts[cls] = (classCounts[cls] || 0) + 1
+      if (classCounts[cls] > maxCount) {
+        maxCount = classCounts[cls]
+        mostActiveClass = cls
+      }
+    }
+  }
+
+  // Average friction
+  const frictionMap: Record<string, number> = { 'low': 1, 'medium': 2, 'high': 3 }
+  const completedWithFriction = completedExperiences.filter(e => e.friction_level)
+  const totalFriction = completedWithFriction.reduce((sum, e) => sum + (frictionMap[e.friction_level!] || 0), 0)
+  
   const experienceCount = {
     total: experiences.length,
-    completed: experiences.filter(e => e.status === 'completed').length,
+    completed: completedExperiences.length,
     active: experiences.filter(e => e.status === 'active').length,
-    ephemeral: experiences.filter(e => e.instance_type === 'ephemeral').length
+    ephemeral: experiences.filter(e => e.instance_type === 'ephemeral').length,
+    completionRate: experiences.length > 0 ? (completedExperiences.length / experiences.length) * 100 : 0,
+    mostActiveClass,
+    averageFriction: completedWithFriction.length > 0 ? totalFriction / completedWithFriction.length : 0
   }
 
   const topInterests = facets
diff --git a/lib/services/graph-service.ts b/lib/services/graph-service.ts
index 722ad9c..0d99bdb 100644
--- a/lib/services/graph-service.ts
+++ b/lib/services/graph-service.ts
@@ -1,4 +1,4 @@
-import { ExperienceInstance, getExperienceInstanceById, updateExperienceInstance, getExperienceTemplates, getExperienceInstances } from './experience-service';
+import { ExperienceInstance, getExperienceInstanceById, updateExperienceInstance, getExperienceTemplates, getExperienceInstances, createExperienceInstance, getExperienceSteps, createExperienceSteps } from './experience-service';
 import { ExperienceChainContext } from '@/types/graph';
 import { getProgressionSuggestions, shouldEscalateResolution } from '@/lib/experience/progression-rules';
 import { runFlowSafe } from '../ai/safe-flow';
@@ -138,14 +138,71 @@ export async function getLoopInstances(userId: string, templateId: string): Prom
     .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
 }
 
-/**
- * Returns the count of same-template instances for a user.
- */
+
 export async function getLoopCount(userId: string, templateId: string): Promise<number> {
   const instances = await getLoopInstances(userId, templateId);
   return instances.length;
 }
 
+/**
+ * Creates a new iteration of a recurring experience.
+ */
+export async function createLoopInstance(userId: string, templateId: string, sourceInstanceId: string): Promise<ExperienceInstance> {
+  const source = await getExperienceInstanceById(sourceInstanceId);
+  if (!source) throw new Error(`Source instance not found: ${sourceInstanceId}`);
+
+  const loopCount = await getLoopCount(userId, templateId);
+  const iteration = loopCount + 1;
+  const title = source.title.includes(' (Week ') 
+    ? source.title.replace(/\(Week \d+\)$/, `(Week ${iteration})`)
+    : `${source.title} (Week ${iteration})`;
+
+  const instanceData: Omit<ExperienceInstance, 'id' | 'created_at'> = {
+    user_id: userId,
+    template_id: templateId,
+    title,
+    goal: source.goal,
+    instance_type: 'persistent',
+    status: 'proposed',
+    resolution: source.resolution,
+    reentry: {
+      trigger: 'time',
+      prompt: 'Weekly check-in',
+      contextScope: 'focused'
+    },
+    previous_experience_id: sourceInstanceId,
+    next_suggested_ids: [],
+    friction_level: null,
+    source_conversation_id: source.source_conversation_id,
+    generated_by: 'system',
+    published_at: null
+  };
+
+  const newInstance = await createExperienceInstance(instanceData);
+  
+  // Clone steps from source
+  const sourceSteps = await getExperienceSteps(sourceInstanceId);
+  const newSteps = sourceSteps.map(step => ({
+    instance_id: newInstance.id,
+    step_order: step.step_order,
+    step_type: step.step_type,
+    title: step.title,
+    payload: step.payload,
+    completion_rule: step.completion_rule
+  }));
+
+  await createExperienceSteps(newSteps);
+
+  return newInstance;
+}
+
+/**
+ * Returns loop history (sorted by date)
+ */
+export async function getLoopHistory(userId: string, templateId: string): Promise<ExperienceInstance[]> {
+  return getLoopInstances(userId, templateId);
+}
+
 /**
  * Aggregates graph stats for the GPT state packet.
  */
diff --git a/lib/services/home-summary-service.ts b/lib/services/home-summary-service.ts
index 23665e4..5639b0c 100644
--- a/lib/services/home-summary-service.ts
+++ b/lib/services/home-summary-service.ts
@@ -174,6 +174,13 @@ export async function getHomeSummary(userId: string = DEFAULT_USER_ID) {
   const lastVisitThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
   const newKnowledgeUnitsCount = knowledgeUnits.filter(u => u.created_at > lastVisitThreshold).length;
 
+  // 5. Calculate pending ephemerals (last 24h, injected status)
+  const pendingEphemerals = allInstances.filter(e => 
+    e.instance_type === 'ephemeral' && 
+    e.status === 'injected' &&
+    e.created_at > lastVisitThreshold
+  );
+
   return {
     activeGoal,
     skillDomains,
@@ -186,6 +193,7 @@ export async function getHomeSummary(userId: string = DEFAULT_USER_ID) {
     },
     proposedExperiences,
     activeExperiences,
+    pendingEphemerals,
     knowledgeSummary,
     newKnowledgeUnitsCount,
     outlines: outlines.filter(o => o.status === 'active' || o.status === 'planning'),
diff --git a/lib/services/synthesis-service.ts b/lib/services/synthesis-service.ts
index 8f5cbd2..eb9dc5e 100644
--- a/lib/services/synthesis-service.ts
+++ b/lib/services/synthesis-service.ts
@@ -45,6 +45,15 @@ export async function createSynthesisSnapshot(userId: string, sourceType: string
     snapshot.next_candidates = aiResult.nextCandidates
   }
   
+  // Lane 4: Persist computed friction as a key signal if not already present
+  if (sourceType === 'experience' && !snapshot.key_signals.frictionLevel) {
+    const instances = await adapter.query<ExperienceInstance>('experience_instances', { id: sourceId });
+    const instance = instances[0];
+    if (instance && instance.friction_level) {
+      snapshot.key_signals.frictionLevel = instance.friction_level;
+    }
+  }
+  
   return adapter.saveItem<SynthesisSnapshot>('synthesis_snapshots', snapshot)
 }
 
@@ -98,11 +107,15 @@ export async function buildGPTStatePacket(userId: string): Promise<GPTStatePacke
   // Create the base packet first
   const packet: GPTStatePacket = {
     latestExperiences: experiences.slice(0, 5).map(e => ({ ...e } as ExperienceInstance)),
-    activeReentryPrompts,
+    activeReentryPrompts: activeReentryPrompts.map(p => ({
+      ...p,
+      priority: p.priority // Explicitly ensure priority is carried
+    })),
     frictionSignals,
     suggestedNext: experiences[0]?.next_suggested_ids || [],
     synthesisSnapshot: snapshot,
-    proposedExperiences: proposedExperiences.slice(0, 3).map(e => ({ ...e } as ExperienceInstance))
+    proposedExperiences: proposedExperiences.slice(0, 3).map(e => ({ ...e } as ExperienceInstance)),
+    reentryCount: activeReentryPrompts.length
   }
 
   // W2 - Enrich with compressed state
diff --git a/lib/services/timeline-service.ts b/lib/services/timeline-service.ts
index e9b5996..2f815c8 100644
--- a/lib/services/timeline-service.ts
+++ b/lib/services/timeline-service.ts
@@ -3,18 +3,29 @@ import { getInboxEvents } from './inbox-service'
 import { getExperienceInstances } from './experience-service'
 import { getStorageAdapter } from '@/lib/storage-adapter'
 import { InteractionEvent } from '@/types/interaction'
+import { getKnowledgeUnits, getKnowledgeProgress } from './knowledge-service'
 
 /**
  * Aggregates events from multiple sources:
  * - timeline_events table (via getInboxEvents)
  * - experience_instances table (lifecycle events)
  * - interaction_events table (step completions)
+ * - knowledge_units table (new arrivals)
+ * - knowledge_progress table (mastery promotions)
  */
 export async function getTimelineEntries(userId: string, filter?: TimelineFilter): Promise<TimelineEntry[]> {
-  const [inboxEvents, experienceEntries, interactionEntries] = await Promise.all([
-    getInboxEvents(), // This service currently gets all, but might need userId filtering later
+  const [
+    inboxEvents, 
+    experienceEntries, 
+    interactionEntries,
+    knowledgeUnits,
+    knowledgeProgress
+  ] = await Promise.all([
+    getInboxEvents(), 
     generateExperienceTimelineEntries(userId),
-    generateInteractionTimelineEntries(userId)
+    generateInteractionTimelineEntries(userId),
+    getKnowledgeUnits(userId),
+    getKnowledgeProgress(userId)
   ])
 
   // Aggregate all entries
@@ -31,7 +42,39 @@ export async function getTimelineEntries(userId: string, filter?: TimelineFilter
       metadata: { severity: event.severity, read: event.read }
     }) as TimelineEntry),
     ...experienceEntries,
-    ...interactionEntries
+    ...interactionEntries,
+    ...knowledgeUnits
+      .filter(unit => {
+        // Only show units created in the last 7 days
+        const sevenDaysAgo = new Date()
+        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
+        return new Date(unit.created_at) >= sevenDaysAgo
+      })
+      .map(unit => ({
+        id: `ku-arrival-${unit.id}`,
+        timestamp: unit.created_at,
+        category: 'system',
+        title: `Research arrived: ${unit.title}`,
+        body: unit.thesis,
+        entityId: unit.id,
+        entityType: 'knowledge',
+        actionUrl: `/knowledge/${unit.id}`,
+      }) as TimelineEntry),
+    ...knowledgeProgress
+      .filter(p => p.mastery_status !== 'unseen')
+      .map(p => {
+        const unit = knowledgeUnits.find(u => u.id === p.unit_id)
+        return {
+          id: `kp-promotion-${p.id}`,
+          timestamp: p.created_at, // Using created_at of progress record for the promotion event
+          category: 'system',
+          title: `Mastery level increased: ${unit?.title || 'Unknown Topic'}`,
+          body: `Now at ${p.mastery_status} level.`,
+          entityId: p.unit_id,
+          entityType: 'knowledge',
+          actionUrl: `/knowledge/${p.unit_id}`,
+        } as TimelineEntry
+      })
   ]
 
   // Enrich completion timestamps: if we have a real experience_completed interaction event,
@@ -68,15 +111,18 @@ export async function generateExperienceTimelineEntries(userId: string): Promise
   const entries: TimelineEntry[] = []
 
   for (const instance of instances) {
-    // 1. Proposed
+    const isEphemeral = instance.instance_type === 'ephemeral'
+    
+    // 1. Proposed / Injected
     entries.push({
       id: `exp-proposed-${instance.id}`,
       timestamp: instance.created_at,
       category: 'experience',
-      title: `Experience proposed: ${instance.title}`,
+      title: `${isEphemeral ? 'Ephemeral Moment' : 'Experience'} proposed: ${instance.title}`,
       entityId: instance.id,
       entityType: 'experience',
       actionUrl: `/workspace/${instance.id}`,
+      metadata: { ephemeral: isEphemeral }
     })
 
     // 2. Published
@@ -85,10 +131,11 @@ export async function generateExperienceTimelineEntries(userId: string): Promise
         id: `exp-published-${instance.id}`,
         timestamp: instance.published_at,
         category: 'experience',
-        title: `Experience published: ${instance.title}`,
+        title: `${isEphemeral ? 'Ephemeral Moment' : 'Experience'} published: ${instance.title}`,
         entityId: instance.id,
         entityType: 'experience',
         actionUrl: `/workspace/${instance.id}`,
+        metadata: { ephemeral: isEphemeral }
       })
     }
 
@@ -96,15 +143,13 @@ export async function generateExperienceTimelineEntries(userId: string): Promise
     if (instance.status === 'completed') {
       entries.push({
         id: `exp-completed-${instance.id}`,
-        // Defer timestamp resolution to the caller: getTimelineEntries will
-        // enrich from interaction_events. Use published_at as best available
-        // field since we don't have a completed_at column yet.
         timestamp: instance.published_at || instance.created_at,
         category: 'experience',
-        title: `Experience completed: ${instance.title}`,
+        title: `${isEphemeral ? 'Ephemeral Moment' : 'Experience'} completed: ${instance.title}`,
         entityId: instance.id,
         entityType: 'experience',
         actionUrl: `/workspace/${instance.id}`,
+        metadata: { ephemeral: isEphemeral }
       })
     }
   }
@@ -117,21 +162,10 @@ export async function generateExperienceTimelineEntries(userId: string): Promise
  */
 export async function generateInteractionTimelineEntries(userId: string): Promise<TimelineEntry[]> {
   const adapter = getStorageAdapter()
-  // This is a bit heavy, in production we'd want a dedicated timeline_events record for these.
-  // For now, we query interaction_events.
   const interactions = await adapter.getCollection<InteractionEvent>('interaction_events')
   
-  // We should ideally filter by userId, but interaction_events doesn't have user_id.
-  // We'd need to join with experience_instances. 
-  // For the sake of this groundwork, we'll assume DEFAULT_USER_ID owns these or handle it simply.
-  
   const entries: TimelineEntry[] = []
   
-  // Filter for 'step_completed' or 'experience_completed' types if they existed.
-  // Based on current interaction-service, we have generic event_type.
-  // Let's look for 'task_completed' or 'interaction_captured'? 
-  // Wait, I should check what's actually recorded in the codebase.
-  
   const completionEvents = interactions.filter(i => 
     i.event_type === 'task_completed' || 
     i.event_type === 'experience_completed'
@@ -164,6 +198,8 @@ export async function getTimelineStats(userId: string): Promise<TimelineStats> {
     totalEvents: entries.length,
     experienceEvents: entries.filter(e => e.category === 'experience').length,
     ideaEvents: entries.filter(e => e.category === 'idea').length,
+    systemEvents: entries.filter(e => e.category === 'system').length,
+    githubEvents: entries.filter(e => e.category === 'github').length,
     thisWeek: entries.filter(e => new Date(e.timestamp) >= oneWeekAgo).length
   }
 }
@@ -174,3 +210,4 @@ function mapInboxTypeToTimelineCategory(type: string): TimelineCategory {
   if (type.startsWith('project_') || type.startsWith('task_') || type.startsWith('pr_')) return 'experience'
   return 'system'
 }
+
diff --git a/lib/storage.ts b/lib/storage.ts
index 75a11a7..1eb677c 100644
--- a/lib/storage.ts
+++ b/lib/storage.ts
@@ -31,6 +31,15 @@ export interface StudioStore {
   synthesis_snapshots?: any[]
   profile_facets?: any[]
   conversations?: any[]
+  
+  // Sprint 10+ (Goal OS & Intelligence)
+  timeline_events?: any[]
+  goals?: any[]
+  skill_domains?: any[]
+  curriculum_outlines?: any[]
+  step_knowledge_links?: any[]
+  knowledge_units?: any[]
+  knowledge_progress?: any[]
 }
 
 // Full paths for fs operations
@@ -55,6 +64,13 @@ const STORE_DEFAULTS: Partial<StudioStore> = {
   synthesis_snapshots: [],
   profile_facets: [],
   conversations: [],
+  timeline_events: [],
+  goals: [],
+  skill_domains: [],
+  curriculum_outlines: [],
+  step_knowledge_links: [],
+  knowledge_units: [],
+  knowledge_progress: [],
 }
 
 export function readStore(): StudioStore {
diff --git a/lib/validators/experience-validator.ts b/lib/validators/experience-validator.ts
index eb01fce..a57b211 100644
--- a/lib/validators/experience-validator.ts
+++ b/lib/validators/experience-validator.ts
@@ -84,6 +84,9 @@ export function validateExperiencePayload(body: any): { valid: boolean; errors:
   if (body.goal && (typeof body.goal !== 'string' || body.goal.length > 1000)) {
     errors.push('goal must be a string (max 1000 chars)')
   }
+  if (body.urgency && !['low', 'medium', 'high'].includes(body.urgency)) {
+    errors.push('invalid urgency: (must be "low" | "medium" | "high")')
+  }
 
   // 5. Steps (normalization + validation)
   const normalizedSteps: any[] = []
@@ -127,6 +130,7 @@ export function validateExperiencePayload(body: any): { valid: boolean; errors:
     reentry: body.reentry || null,
     previousExperienceId: body.previousExperienceId || null,
     steps: normalizedSteps,
+    urgency: body.urgency || 'low',
     generated_by: body.generated_by || null,
     source_conversation_id: body.source_conversation_id || null
   }
diff --git a/roadmap.md b/roadmap.md
index 3c7c240..d4b1fa9 100644
--- a/roadmap.md
+++ b/roadmap.md
@@ -82,8 +82,11 @@ Replaced naive string summaries and keyword-splitting with AI-powered intelligen
 | Sprint 10 | ✅ Complete | Curriculum-aware experience engine: curriculum outlines (table + service + types), GPT gateway (5 endpoints: state/plan/create/update/discover), discover registry (9 capabilities), coach API (3 routes), Genkit tutor + grading flows, step-knowledge-link service, OpenAPI rewrite, migration 007 |
 | Sprint 11 | ✅ Complete | MiraK enrichment loop: enrichment webhook mode (experience_id), flat OpenAPI for GPT Actions, Cloud Run stabilization, readKnowledge endpoint, gateway payload tolerance. |
 | Sprint 12 | ✅ Complete | Learning Loop Productization: Visible Track UI, Checkpoint renderer, Coach Triggers, Synthesis Completion, Pre/In/Post Knowledge. The "three emotional moments" are fully functional. |
+| Sprint 13 | ✅ Complete | Goal OS + Skill Map: Goal entity, skill domains array, mastery computation engine, deep intake protocol mapping. |
+| Sprint 14 | ✅ Complete | Mastery Visibility & Intelligence Wiring: Skill Tree UI completion, Profile synthesis integration, Coach contextual triggers. |
+| Sprint 15 | ✅ Complete | Chained Experiences + Spontaneity: Experience graph wiring, ephemeral injection, Re-entry hardening, Timeline feed upgrades. |
 
-### 🔄 Current Phase — Goal OS (Sprint 13)
+### 🔄 Current Phase — Coder Pipeline (Sprint 16+)
 
 The curriculum infrastructure and learning loops are now fully productized, visible, and functioning. The system can plan a curriculum, link knowledge, render checkpoints, provide coaching, and celebrate synthesis natively in the browser.
 
@@ -725,7 +728,7 @@ The user must never wonder "did my research request go anywhere?" This eliminate
 
 ---
 
-### 🔲 Sprint 13 — Goal OS + Skill Map
+### ✅ Sprint 13 — Goal OS + Skill Map
 
 > **Goal:** Give the user a persistent Goal and a visual Skill Tree that makes their position and trajectory visible. Turn "a pile of experiences in a track" into "a growth system with a destination."
 >
@@ -761,7 +764,32 @@ The user must never wonder "did my research request go anywhere?" This eliminate
 
 ---
 
-### 🔲 Sprint 14 — Proposal → Realization → Coder Pipeline (Deferred)
+### ✅ Sprint 14 — Mastery Visibility & Intelligence Wiring
+
+> **Goal:** Surface the mastery engine and ensure the system reacts intelligently to user progress.
+
+- **Skill Tree Upgrades:** Mastery badges, progress bars, and linked experience/knowledge statistics.
+- **Coach Triggers:** Contextual AI surfacing when a user fails a checkpoint or dwells too long.
+- **Completion Retrospective:** Goal trajectory updates, "What Moved" mastery changes, and domain-linked path suggestions.
+- **Intelligent Focus:** Home priority heuristic based on leverage rather than strict recency.
+- **Schema Truth Pass:** Aligned validators, discovery registries, and step payload definitions.
+
+---
+
+### ✅ Sprint 15 — Chained Experiences + Spontaneity
+
+> **Goal:** Make the app feel alive. Experiences chain, loop, interrupt, and progress the user forward.
+
+- **Experience Chaining UI:** Workspace banners for context, "Start Next" post-completion, and dynamic graph wiring.
+- **Ephemeral Injection System:** Real-time urgency toasts forcing low-friction micro-challenges or checks to break linear rigidity. 
+- **Re-Entry Engine Hardening:** Support for interval/manual triggers and high-priority surfacing of "unfinished business" on the home page.
+- **Friction + Weekly Loops:** Automated multi-pass iteration (creating a `loop_record`) when user encounters high friction.
+- **Timeline Evolution:** Event categorization (system, user, knowledge, ephemeral) for full observability. 
+- **Profile Redesign:** Facet cards displaying confidence/evidence linked directly to synthesis snapshots, acting as a clear system-state dashboard.
+
+---
+
+### 🔲 Sprint 16 — Proposal → Realization → Coder Pipeline (Deferred)
 
 > **Goal:** When results from Sprint 5 testing show that GPT-only experiences are too limited, bring the coder into the loop. Generated experiences go through a reviewable pipeline. Ephemeral experiences bypass entirely.
 >
@@ -879,7 +907,7 @@ GPT calls propose endpoint
 5. **The coder can have its own "schema."** Just like the GPT has an OpenAPI schema for API calls, the coder can have a structured spec schema for what it reads from issues. Both are typed contracts.
 6. **The issue is working memory.** The coder can write progress back to it. The GPT and user can read it. The issue becomes the shared context for the entire realization.
 
-#### Sprint 14 Verification
+#### Sprint 16 Verification
 - GPT can POST a proposal that creates both an experience instance AND a GitHub Issue with structured spec
 - User can view and edit the coder spec from the frontend review UI
 - GPT can update the issue body via API when the user refines their request
@@ -889,36 +917,7 @@ GPT calls propose endpoint
 - Legacy PR merge flow still works
 - Ephemeral experiences are confirmed to NOT appear in review queue
 
----
-
-### 🔲 Sprint 15 — Chained Experiences + Spontaneity
-
-> **Goal:** Make the app feel alive. Experiences chain, loop, interrupt, and progress the user forward.
-
-| # | Work Item | Detail |
-|---|-----------|--------|
-| 1 | Experience graph wiring | Use `previous_experience_id` and `next_suggested_ids` on instances to build chains. Library shows "continue" and "related" links. |
-| 2 | Progression rules | `lib/experience/progression-rules.ts` — defines chains: Questionnaire → Plan Builder → Challenge. Resolution carries forward or escalates. |
-| 3 | Ephemeral injection system | GPT can inject ephemeral experiences at any time: trend alerts, micro-challenges, quick prompts. These appear as interruptive cards in the workspace or as toast-like prompts. |
-| 4 | Re-entry engine hardening | `lib/experience/reentry-engine.ts` already exists. Harden: add time-based triggers, manual triggers, better inactivity detection. |
-| 5 | Weekly loops | Recurring experience instances (e.g., weekly reflection). Same template, new instance, linked via graph. |
-| 6 | Friction synthesis | Compute `friction_level` during synthesis snapshot creation. GPT uses this to adjust future proposals. |
-| 7 | Follow-up prompts | After experience completion, re-entry contract surfaces in next GPT session as prioritized suggestion. |
-| 8 | Timeline page | `app/timeline/page.tsx` — chronological view of GPT proposals, realizations, completions, ephemerals, suggestions. |
-| 9 | Profile page | `app/profile/page.tsx` — compiled view of interests, goals, efforts, patterns, skill trajectory. Read-only, derived from facets. |
-
-#### Sprint 15 Verification
-- Completing a Questionnaire surfaces a Plan Builder suggestion via graph
-- GPT can inject an ephemeral challenge that renders instantly
-- Re-entry contract fires after completion and shows in GPT state
-- Weekly reflection creates a new linked instance
-- Timeline shows full event history including ephemerals
-- Profile reflects accumulated facets from interactions
-- Friction level is computed and returned in synthesis packet
-
----
-
-### 🔲 Sprint 16 — GitHub Hardening + GitHub App
+### 🔲 Sprint 17 — GitHub Hardening + GitHub App
 
 > **Goal:** Make the realization side production-serious. Migrate from PAT to GitHub App for proper auth.
 
diff --git a/test_synthesis.js b/test_synthesis.js
new file mode 100644
index 0000000..249129a
--- /dev/null
+++ b/test_synthesis.js
@@ -0,0 +1,39 @@
+const http = require('http');
+
+http.get('http://localhost:3000/api/experiences', (res) => {
+  let data = '';
+  res.on('data', (chunk) => { data += chunk; });
+  res.on('end', () => {
+    try {
+      const experiences = JSON.parse(data);
+      const decLine = experiences[0];
+      if (decLine) {
+        console.log("Found instance:", decLine.id);
+        const postData = JSON.stringify({
+          userId: decLine.user_id,
+          sourceType: 'persistent',
+          sourceId: decLine.id
+        });
+        const req = http.request({
+          hostname: 'localhost',
+          port: 3000,
+          path: '/api/synthesis',
+          method: 'POST',
+          headers: {
+            'Content-Type': 'application/json',
+            'Content-Length': Buffer.byteLength(postData)
+          }
+        }, (res2) => {
+          let resData = '';
+          res2.on('data', (c) => resData += c);
+          res2.on('end', () => console.log('POST Response:', res2.statusCode, resData));
+        });
+        req.on('error', (e) => console.error(e));
+        req.write(postData);
+        req.end();
+      }
+    } catch (e) {
+      console.error(e.message);
+    }
+  });
+});
diff --git a/types/experience.ts b/types/experience.ts
index 9ef1be8..887bd4a 100644
--- a/types/experience.ts
+++ b/types/experience.ts
@@ -31,6 +31,7 @@ export interface ReentryContract {
   trigger: 'time' | 'completion' | 'inactivity' | 'manual';
   prompt: string;
   contextScope: 'minimal' | 'full' | 'focused';
+  timeAfterCompletion?: string; // e.g. '24h', '7d'
 }
 
 export interface ExperienceTemplate {
diff --git a/types/profile.ts b/types/profile.ts
index 74790aa..62bca47 100644
--- a/types/profile.ts
+++ b/types/profile.ts
@@ -20,7 +20,15 @@ export interface UserProfile {
   topInterests: string[];
   topSkills: string[];
   activeGoals: string[];
-  experienceCount: { total: number; completed: number; active: number; ephemeral: number };
+  experienceCount: { 
+    total: number; 
+    completed: number; 
+    active: number; 
+    ephemeral: number;
+    completionRate: number;
+    mostActiveClass: string | null;
+    averageFriction: number;
+  };
   preferredDepth: string | null;
   preferredMode: string | null;
   memberSince: string;
diff --git a/types/synthesis.ts b/types/synthesis.ts
index 7bc6812..57483bd 100644
--- a/types/synthesis.ts
+++ b/types/synthesis.ts
@@ -30,4 +30,5 @@ export interface GPTStatePacket {
     prioritySignals: string[];
     suggestedOpeningTopic: string;
   };
+  reentryCount?: number;
 }
diff --git a/types/timeline.ts b/types/timeline.ts
index e05298e..19c563a 100644
--- a/types/timeline.ts
+++ b/types/timeline.ts
@@ -7,7 +7,7 @@ export interface TimelineEntry {
   title: string;
   body?: string;
   entityId?: string;
-  entityType?: 'experience' | 'idea' | 'project' | 'pr';
+  entityType?: 'experience' | 'idea' | 'project' | 'pr' | 'knowledge';
   actionUrl?: string;
   metadata?: Record<string, any>;
 }
@@ -22,5 +22,7 @@ export interface TimelineStats {
   totalEvents: number;
   experienceEvents: number;
   ideaEvents: number;
+  systemEvents: number;
+  githubEvents: number;
   thisWeek: number;
 }
```

```

### gpt-instructions.md

```markdown
# Mira GPT Instructions
userId: `a0000000-0000-0000-0000-000000000001` (include in all calls). Use flat fields only (no nested `payload` key).

## 1. Discovery & State
Call `getGPTState` (GET /api/gpt/state) on every re-entry. It returns active experiences, re-entry prompts, friction signals, knowledge summary, curriculum progress, and the user's active Goal and skill domains.
**Goal re-entry**: If an active goal exists, reference it and suggest the next-highest-leverage domain from its domain list.
Call `discoverCapability(capability=...)` (GET /api/gpt/discover) for exact schemas (goal, templates, resolution, step_payload, etc.).
**Changes Tracker**: Call `getChangeReports` (GET /api/gpt/changes) to review user-submitted UI bugs, UX issues, or feature ideas reported directly from the app interface. Use this context to help the user scope the next version of the app or clarify UI drift.

## 2. Autonomous Extrapolation & Cold Starts
If a user comes in cold with a massive ambition (e.g., "I want to be an astronaut" or "I want to start a YouTube channel"):
1. **The Diagnostic First Pass**: Do not instantly generate a 6-month outline. First, probe their baseline and blockers. Quickly inject a "first pass" diagnostic experience (or ephemeral) designed to get them to just *act*. 
2. **Observe & Uncover Reality**: Use their interaction with that first experience to uncover their actual gaps—look for the Dunning-Kruger effect, hidden ignorance, or fundamental prerequisites they missed.
3. **Assess the Gaps & Dispatch Research**: Use `planCurriculum(action="assess_gaps")` to formally map these reality-checked gaps. Send topics to MiraK (`planCurriculum(action="dispatch_research", topic="...")`) immediately to get expert scaffolding.
4. **Extrapolate**: Once you know the *real* gaps, autonomously build out the curriculum and push the next deep experience (`createEntity`). Take the lead.

## 3. Goal Intake Protocol
When a user expresses a growth direction or broad learning intent:
1. **Create Goal First**: `createEntity(type="goal", title="...", description="...", domains=["...", "..."])`.
2. **Scope Planning**: `planCurriculum(action="create_outline", topic="...", subtopics=[...], goalId="<Goal ID>")`.
Linking the first outline to a goal transitions it from `intake` to `active`.

## 4. Experience Generation & Chaining
Author right-sized experiences (3–6 steps, 20m max) focusing on exactly ONE subtopic.
- **Ephemeral** (`type="ephemeral"`): Instant, no review. Drop them in for spontaneous nudges or micro-challenges anytime an opportunity arises based on friction or inactivity.
- **Persistent** (`type="experience"`): Propose first; requires user acceptance to activate.
- **Chaining**: If continuing a journey from an existing experience, use `previousExperienceId` in creation to link the graph UI.
- **MiraK Research**: After creating a deep experience, call `generateKnowledge(topic="...", experience_id="...")`. *Fire-and-forget*: Tell the user research is arriving; never wait, poll, or tell the user to wait.

## 5. Step Types & Mastery
- **Lesson**: Use `sections` array (heading, body, type). No raw content strings.
- **Reflection**: Use `prompts` array (id, text), not a single prompt string.
- **Questionnaire**: Use `label` for questions, not `text`.
- **Checkpoint**: Graded questions. **SOP**: ALWAYS link a `knowledge_unit_id` from `/api/knowledge` via `updateEntity(action="link_knowledge")` to enable strict grading against evidence.
- **Challenge** (objectives), **Plan Builder** (timeline), **Essay Tasks** (content and tasks array).
- **Resolution**: Mandatory. `light` (minimal chrome), `medium` (progress bar), `heavy` (full goal scaffolding).

## 6. Lifecycle Transitions & Re-Entry
- **Approve Persistent**: Propose → `approve` → `publish` → `activate`.
- **Complete**: Transition to `completed` when user finishes the final step. Note: High friction reported via synthesis automatically generates a `loop_record` experience for iteration.
- **Proactive Empathy**: Check state first. Address completion momentum, inactivity gaps, or user-reported UI feedback (Changes). Explain persistent plans before proposing. Nudge via ephemeral without asking. Explained value over generic boilerplate. Never act like you forgot the user.

```

### ideas.md

```markdown
# Consolidated Backlog & Product Ideas

> This document collects architectural concepts, design patterns, and features that have been planned or proposed but are not yet implemented in the codebase or the main roadmap. It consolidates previous loose files (`coach.md`, `end.md`, `content.md`, `knowledge.md`, `wiring.md`, and the `content/` folder).

---

## 1. Advanced Experience Engine Orchestration

While basic Ephemeral and Persistent experiences exist, the system still needs advanced orchestration logic when multiple experiences collide.

### Ephemeral Orchestration Policy
When an Ephemeral experience is injected but the user is already doing something, the system needs a display strategy. Ideas:
- **Replace (Current default):** Overwrite the current ephemeral. Clean UX but loses context.
- **Stack (Queue):** Add to a queue. Safe but can feel heavy.
- **Interrupt & Resume (Ideal):** Pause current experience, render the new one, and allow resuming the previous one later. Requires state tracking per step.

### Proposal Handling Lifecycle
Proposed experiences need distinct front-end UX behaviors:
- **Deliberate Choice Moments:** Make proposals intentional. Provide `accept`, `dismiss`, and `snooze` actions.
- **Consequences:** `accept` makes it active; `dismiss` transitions it to archived/rejected to prevent lingering.

### Idea → Experience Transformation Pipeline
There is currently a gap between captured "Ideas" and executable "Experiences." 
- **The Missing Link:** A transformation pipeline that takes an `idea_id` and an `intent` (explore / validate / prototype / execute) and automatically generates a structured experience payload. 

### Resolving "Re-entry Accumulation"
Completed experiences leave lingering re-entry triggers. We need a Re-entry Controller:
- `reentry_status: "pending" | "shown" | "completed" | "dismissed"`
- Define max active re-entries (e.g., 1).
- Priority rules sorting by recency or intensity.

---

## 2. Unimplemented Genkit / AI Coach Flows

Several intelligence layers from the original AI Coach proposal are not yet in the codebase. These should be considered for future sprints:

- **Experience Content Generation (`generateExperienceContentFlow`):** Expand lightweight Custom GPT proposals into full, validated step payloads. Separates the *intent* from the *realization*.
- **Friction Analysis (`analyzeFrictionFlow`):** Look at the *pattern* of interaction (temporal limits + skips) rather than just mechanical steps completed to detect struggle vs engagement.
- **Intelligent Re-Entry (`generateReentryPromptFlow`):** Generate dynamic re-entry prompts based on specific interaction patterns instead of using static trigger strings.
- **Experience Quality Scoring (`scoreExperienceQualityFlow`):** A pre-publish AI gate that flags coherence, actionability, and depth issues before an experience becomes active.
- **Goal Decomposition (`decomposeGoalFlow`):** Take a high-level goal and break it down into structured milestones and dependencies inside the Plan Builder.
- **Lesson Enhancement (`enhanceLessonContentFlow`):** Take rough lesson payloads and enhance them with callouts, checkpoints, and reading-level adjustments.
- **Weekly Intelligence Digest (`generateWeeklyDigestFlow`):** Compile proactive weekly reports (summary, key insights, momentum score, nudges).
- **A/B Testing (`evaluateExperienceVariantsFlow`):** Analyze interaction data from two experience variants to see which performs better.
- **Content Safety Guard (`contentGuardFlow`):** Validate generated content for safety and appropriateness.
- **Experience Narration (`narrateExperienceFlow`):** Text-to-speech generation for lesson/essay content.

---

## 3. Knowledge Base UX & Writing Guidelines

### The "Encyclopedia Problem"
The multi-agent research pipeline (MiraK) produces very high-density reference outputs. When presented in the Knowledge Tab, it can feel like a dense encyclopedia page rather than a teachable narrative.
**Future Fixes:**
- Restructure the UI of the Knowledge Area to serve as a textbook rather than a data dump.
- Potentially add another processing pass to serialize the data for better UI consumption.

### Knowledge Writing Principles (For Agents & Humans)
When authoring knowledge base content (e.g., MiraK agents):
- **Utility First:** Organize around a user job, not a broad topic. Tell the reader what this is, when to use it, the core takeaway, and what to do next right away.
- **Tone:** Practical, clear, intelligent, and concise. No fluff, no "corporate/academic" voice.
- **Structure:** 
  - *Core Idea:* Direct explanation.
  - *Worked Example:* Provide a realistic scenario.
  - *Guided Application:* Give the reader a quick test or prompt.
  - *Decision Rules:* Crisp heuristics or if/then checks.
  - *Common Mistakes & Failure Modes:* Traps and how to recover.
  - *Retrieval/Reflection:* Questions that require recall and thought.
- **Adaptive Difficulty:** Slow down and define terms for beginners; shorten explanations and prioritize edge cases for advanced readers.

---

## 4. Product Principles & Copy Rules

- **No Limbo:** An idea is either "In Progress", "On Hold", or "Removed". There is no "maybe" shelf. Stale items (on hold > 14 days) prompt a decision.
- **Definition Drill:** The 6 questions to clarify any idea:
  1. Intent (strip the excitement)
  2. Success Metric (one number)
  3. Scope (S/M/L)
  4. Execution Path (Solo/Assisted/Delegated)
  5. Priority
  6. Decision
- **Tone Guide:** Direct, Short, Honest, No Celebration. (e.g., "Idea captured. Decide what to do next." instead of "Great news! Your idea has been saved!")

---

## 5. Technical Context (Legacy Setup)

- **Infrastructure Wiring:** GitHub factory operations require PAT scopes `repo`, `workflow`, and `admin:repo_hook` combined with HMAC webhook signatures. Copilot SWE Agent uses `custom_workflow_dispatch` locally if the organization lacks Copilot Enterprise. Supabase uses standard RLS public reads and service_role administration routes.

```

### next-env.d.ts

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/building-your-application/configuring/typescript for more information.

```

### printcode.sh

```bash
#!/bin/bash
# =============================================================================
# printcode.sh — Smart project dump for AI chat contexts
# =============================================================================
#
# Outputs project structure and source code to numbered markdown dump files
# (dump00.md … dump09.md). Running with NO arguments dumps the whole repo
# exactly as before. With CLI flags you can target specific areas, filter by
# extension, slice line ranges, or just list files.
#
# Upload this script to a chat session so the agent can tell you which
# arguments to run to get exactly the context it needs.
#
# Usage: ./printcode.sh [OPTIONS]
# Run ./printcode.sh --help for full details and examples.
# =============================================================================

set -e

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
OUTPUT_PREFIX="dump"
LINES_PER_FILE=""          # empty = auto-calculate to fit MAX_DUMP_FILES
MAX_DUMP_FILES=10
MAX_FILES=""               # empty = unlimited
MAX_BYTES=""               # empty = unlimited
SHOW_STRUCTURE=true
LIST_ONLY=false
SLICE_MODE=""              # head | tail | range
SLICE_N=""
SLICE_A=""
SLICE_B=""

declare -a AREAS=()
declare -a INCLUDE_PATHS=()
declare -a USER_EXCLUDES=()
declare -a EXT_FILTER=()

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Area → glob mappings
# ---------------------------------------------------------------------------
# Returns a newline-separated list of globs for a given area name.
globs_for_area() {
    case "$1" in
        backend)   echo "backend/**" ;;
        frontend)
            if [[ -d "$PROJECT_ROOT/frontend" ]]; then
                echo "frontend/**"
            elif [[ -d "$PROJECT_ROOT/web" ]]; then
                echo "web/**"
            else
                echo "frontend/**"
            fi
            ;;
        docs)      printf '%s\n' "docs/**" "*.md" ;;
        scripts)   echo "scripts/**" ;;
        plugins)   echo "plugins/**" ;;
        tests)     echo "tests/**" ;;
        config)    printf '%s\n' "*.toml" "*.yaml" "*.yml" "*.json" "*.ini" ".env*" ;;
        *)
            echo "Error: unknown area '$1'" >&2
            echo "Valid areas: backend frontend docs scripts plugins tests config" >&2
            exit 1
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
show_help() {
cat <<'EOF'
printcode.sh — Smart project dump for AI chat contexts

USAGE
  ./printcode.sh [OPTIONS]

With no arguments the entire repo is dumped into dump00.md … dump09.md
(same as original behavior). Options let you target specific areas,
filter by extension, slice line ranges, or list files without code.

AREA PRESETS (--area, repeatable)
  backend   backend/**
  frontend  frontend/** (or web/**)
  docs      docs/** *.md
  scripts   scripts/**
  plugins   plugins/**
  tests     tests/**
  config    *.toml *.yaml *.yml *.json *.ini .env*

OPTIONS
  --area <name>          Include only files matching the named area (repeatable).
  --path <glob>          Include only files matching this glob (repeatable).
  --exclude <glob>       Add extra exclude glob on top of defaults (repeatable).
  --ext <ext[,ext,…]>   Include only files with these extensions (comma-sep).

  --head <N>             Keep only the first N lines of each file.
  --tail <N>             Keep only the last N lines of each file.
  --range <A:B>          Keep only lines A through B of each file.
                         (Only one of head/tail/range may be used at a time.)

  --list                 Print only the file list / project structure (no code).
  --no-structure         Skip the project-structure tree section.
  --lines-per-file <N>  Override auto-calculated lines-per-dump-file split.
  --max-files <N>        Stop after selecting N files (safety guard).
  --max-bytes <N>        Stop once cumulative selected size exceeds N bytes.
  --output-prefix <pfx>  Change dump file prefix (default: "dump").

  --help                 Show this help and exit.

EXAMPLES
  # 1) Default — full project dump (original behavior)
  ./printcode.sh

  # 2) Backend only
  ./printcode.sh --area backend

  # 3) Backend + docs, last 200 lines of each file
  ./printcode.sh --area backend --area docs --tail 200

  # 4) Only specific paths
  ./printcode.sh --path "backend/agent/**" --path "backend/services/**"

  # 5) Only Python and Markdown files
  ./printcode.sh --ext py,md

  # 6) List-only mode for docs area (no code blocks)
  ./printcode.sh --list --area docs

  # 7) Range slicing on agent internals
  ./printcode.sh --path "backend/agent/**" --range 80:220

  # 8) Backend Python files, first 120 lines each
  ./printcode.sh --area backend --ext py --head 120

  # 9) Config files only, custom output prefix
  ./printcode.sh --area config --output-prefix config_dump

  # 10) Everything except tests, cap at 50 files
  ./printcode.sh --exclude "tests/**" --max-files 50
EOF
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --help|-h)
            show_help
            exit 0
            ;;
        --area)
            [[ -z "${2:-}" ]] && { echo "Error: --area requires a value" >&2; exit 1; }
            case "$2" in
                backend|frontend|docs|scripts|plugins|tests|config) ;;
                *) echo "Error: unknown area '$2'" >&2
                   echo "Valid areas: backend frontend docs scripts plugins tests config" >&2
                   exit 1 ;;
            esac
            AREAS+=("$2"); shift 2
            ;;
        --path)
            [[ -z "${2:-}" ]] && { echo "Error: --path requires a value" >&2; exit 1; }
            INCLUDE_PATHS+=("$2"); shift 2
            ;;
        --exclude)
            [[ -z "${2:-}" ]] && { echo "Error: --exclude requires a value" >&2; exit 1; }
            USER_EXCLUDES+=("$2"); shift 2
            ;;
        --ext)
            [[ -z "${2:-}" ]] && { echo "Error: --ext requires a value" >&2; exit 1; }
            IFS=',' read -ra EXT_FILTER <<< "$2"; shift 2
            ;;
        --head)
            [[ -z "${2:-}" ]] && { echo "Error: --head requires a number" >&2; exit 1; }
            [[ -n "$SLICE_MODE" ]] && { echo "Error: cannot combine --head with --$SLICE_MODE" >&2; exit 1; }
            SLICE_MODE="head"; SLICE_N="$2"; shift 2
            ;;
        --tail)
            [[ -z "${2:-}" ]] && { echo "Error: --tail requires a number" >&2; exit 1; }
            [[ -n "$SLICE_MODE" ]] && { echo "Error: cannot combine --tail with --$SLICE_MODE" >&2; exit 1; }
            SLICE_MODE="tail"; SLICE_N="$2"; shift 2
            ;;
        --range)
            [[ -z "${2:-}" ]] && { echo "Error: --range requires A:B" >&2; exit 1; }
            [[ -n "$SLICE_MODE" ]] && { echo "Error: cannot combine --range with --$SLICE_MODE" >&2; exit 1; }
            SLICE_MODE="range"
            SLICE_A="${2%%:*}"
            SLICE_B="${2##*:}"
            if [[ -z "$SLICE_A" || -z "$SLICE_B" || "$2" != *":"* ]]; then
                echo "Error: --range format must be A:B (e.g. 80:220)" >&2; exit 1
            fi
            shift 2
            ;;
        --list)
            LIST_ONLY=true; shift
            ;;
        --no-structure)
            SHOW_STRUCTURE=false; shift
            ;;
        --lines-per-file)
            [[ -z "${2:-}" ]] && { echo "Error: --lines-per-file requires a number" >&2; exit 1; }
            LINES_PER_FILE="$2"; shift 2
            ;;
        --max-files)
            [[ -z "${2:-}" ]] && { echo "Error: --max-files requires a number" >&2; exit 1; }
            MAX_FILES="$2"; shift 2
            ;;
        --max-bytes)
            [[ -z "${2:-}" ]] && { echo "Error: --max-bytes requires a number" >&2; exit 1; }
            MAX_BYTES="$2"; shift 2
            ;;
        --output-prefix)
            [[ -z "${2:-}" ]] && { echo "Error: --output-prefix requires a value" >&2; exit 1; }
            OUTPUT_PREFIX="$2"; shift 2
            ;;
        *)
            echo "Error: unknown option '$1'" >&2
            echo "Run ./printcode.sh --help for usage." >&2
            exit 1
            ;;
    esac
done

# ---------------------------------------------------------------------------
# Build include patterns from areas + paths
# ---------------------------------------------------------------------------
declare -a INCLUDE_PATTERNS=()

for area in "${AREAS[@]}"; do
    while IFS= read -r glob; do
        INCLUDE_PATTERNS+=("$glob")
    done < <(globs_for_area "$area")
done

for p in "${INCLUDE_PATHS[@]}"; do
    INCLUDE_PATTERNS+=("$p")
done

# ---------------------------------------------------------------------------
# Default excludes (always applied)
# ---------------------------------------------------------------------------
DEFAULT_EXCLUDES=(
    "*/__pycache__/*"
    "*/.git/*"
    "*/node_modules/*"
    "*/dist/*"
    "*/.next/*"
    "*/build/*"
    "*/data/*"
    "*/cache/*"
    "*/shards/*"
    "*/results/*"
    "*/.venv/*"
    "*/venv/*"
    "*_archive/*"
)

# Merge user excludes
ALL_EXCLUDES=("${DEFAULT_EXCLUDES[@]}" "${USER_EXCLUDES[@]}")

# ---------------------------------------------------------------------------
# Default included extensions (when no filters are active)
# ---------------------------------------------------------------------------
# Original extensions: py sh md yaml yml ts tsx css
# Added toml json ini for config area support
DEFAULT_EXTS=(py sh md yaml yml ts tsx css toml json ini)

# ---------------------------------------------------------------------------
# Language hint from extension
# ---------------------------------------------------------------------------
lang_for_ext() {
    case "$1" in
        py)       echo "python" ;;
        sh)       echo "bash" ;;
        md)       echo "markdown" ;;
        yaml|yml) echo "yaml" ;;
        ts)       echo "typescript" ;;
        tsx)      echo "tsx" ;;
        css)      echo "css" ;;
        toml)     echo "toml" ;;
        json)     echo "json" ;;
        ini)      echo "ini" ;;
        js)       echo "javascript" ;;
        jsx)      echo "jsx" ;;
        html)     echo "html" ;;
        sql)      echo "sql" ;;
        *)        echo "" ;;
    esac
}

# ---------------------------------------------------------------------------
# Priority ordering (same as original)
# ---------------------------------------------------------------------------
priority_for_path() {
    local rel_path="$1"
    case "$rel_path" in
        AI_WORKING_GUIDE.md|\
        MIGRATION.md|\
        README.md|\
        app/layout.tsx|\
        app/page.tsx|\
        package.json)
            echo "00"
            ;;
        app/*|\
        components/*|\
        lib/*|\
        hooks/*)
            echo "20"
            ;;
        *)
            echo "50"
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Temp files
# ---------------------------------------------------------------------------
TEMP_FILE=$(mktemp)
FILE_LIST=$(mktemp)
_TMPFILES=("$TEMP_FILE" "$FILE_LIST")
trap 'rm -f "${_TMPFILES[@]}"' EXIT

# Helper: convert a file glob to a grep-compatible regex.
# Steps: escape dots → ** marker → * to [^/]* → marker to .*
glob_to_regex() {
    echo "$1" | sed 's/\./\\./g; s/\*\*/\x00/g; s/\*/[^\/]*/g; s/\x00/.*/g'
}

# ---------------------------------------------------------------------------
# Build the find command
# ---------------------------------------------------------------------------
# Exclude clauses — only default excludes go into find (they use */ prefix)
FIND_EXCLUDES=()
for pat in "${DEFAULT_EXCLUDES[@]}"; do
    FIND_EXCLUDES+=( ! -path "$pat" )
done
# Always exclude dump output files, lock files, binary data
FIND_EXCLUDES+=(
    ! -name "*.pyc"
    ! -name "*.parquet"
    ! -name "*.pth"
    ! -name "*.lock"
    ! -name "package-lock.json"
    ! -name "continuous_contract.json"
    ! -name "dump*.md"
    ! -name "dump*[0-9]"
)

# Determine which extensions to match
ACTIVE_EXTS=()
if [[ ${#EXT_FILTER[@]} -gt 0 ]]; then
    ACTIVE_EXTS=("${EXT_FILTER[@]}")
elif [[ ${#INCLUDE_PATTERNS[@]} -eq 0 ]]; then
    # No area/path filter and no ext filter → use defaults
    ACTIVE_EXTS=("${DEFAULT_EXTS[@]}")
fi
# When area/path filters are active but --ext is not, include all extensions
# (the path filter itself narrows things down).

# Build extension match clause for find
EXT_CLAUSE=()
if [[ ${#ACTIVE_EXTS[@]} -gt 0 ]]; then
    EXT_CLAUSE+=( "(" )
    first=true
    for ext in "${ACTIVE_EXTS[@]}"; do
        if $first; then first=false; else EXT_CLAUSE+=( -o ); fi
        EXT_CLAUSE+=( -name "*.${ext}" )
    done
    EXT_CLAUSE+=( ")" )
fi

# Run find to collect candidate files
find "$PROJECT_ROOT" -type f \
    "${FIND_EXCLUDES[@]}" \
    "${EXT_CLAUSE[@]}" \
    2>/dev/null \
    | sed "s|$PROJECT_ROOT/||" \
    | sort > "$FILE_LIST"

# ---------------------------------------------------------------------------
# Apply user --exclude patterns (on relative paths)
# ---------------------------------------------------------------------------
if [[ ${#USER_EXCLUDES[@]} -gt 0 ]]; then
    EXCLUDE_REGEXES=()
    for pat in "${USER_EXCLUDES[@]}"; do
        EXCLUDE_REGEXES+=( -e "$(glob_to_regex "$pat")" )
    done
    grep -v -E "${EXCLUDE_REGEXES[@]}" "$FILE_LIST" > "${FILE_LIST}.tmp" || true
    mv "${FILE_LIST}.tmp" "$FILE_LIST"
fi

# ---------------------------------------------------------------------------
# Apply include-pattern filtering (areas + paths)
# ---------------------------------------------------------------------------
if [[ ${#INCLUDE_PATTERNS[@]} -gt 0 ]]; then
    FILTERED=$(mktemp)
    _TMPFILES+=("$FILTERED")
    for pat in "${INCLUDE_PATTERNS[@]}"; do
        regex="^$(glob_to_regex "$pat")$"
        grep -E "$regex" "$FILE_LIST" >> "$FILTERED" 2>/dev/null || true
    done
    # Deduplicate (patterns may overlap)
    sort -u "$FILTERED" > "${FILTERED}.tmp"
    mv "${FILTERED}.tmp" "$FILTERED"
    mv "$FILTERED" "$FILE_LIST"
fi

# ---------------------------------------------------------------------------
# Apply --max-files and --max-bytes guards
# ---------------------------------------------------------------------------
if [[ -n "$MAX_FILES" ]]; then
    head -n "$MAX_FILES" "$FILE_LIST" > "${FILE_LIST}.tmp"
    mv "${FILE_LIST}.tmp" "$FILE_LIST"
fi

if [[ -n "$MAX_BYTES" ]]; then
    CUMULATIVE=0
    CAPPED=$(mktemp)
    _TMPFILES+=("$CAPPED")
    while IFS= read -r rel_path; do
        fsize=$(wc -c < "$PROJECT_ROOT/$rel_path" 2>/dev/null || echo 0)
        CUMULATIVE=$((CUMULATIVE + fsize))
        if (( CUMULATIVE > MAX_BYTES )); then
            echo "(max-bytes $MAX_BYTES reached, stopping)" >&2
            break
        fi
        echo "$rel_path"
    done < "$FILE_LIST" > "$CAPPED"
    mv "$CAPPED" "$FILE_LIST"
fi

# ---------------------------------------------------------------------------
# Sort by priority
# ---------------------------------------------------------------------------
SORTED_LIST=$(mktemp)
_TMPFILES+=("$SORTED_LIST")
while IFS= read -r rel_path; do
    printf "%s\t%s\n" "$(priority_for_path "$rel_path")" "$rel_path"
done < "$FILE_LIST" \
    | sort -t $'\t' -k1,1 -k2,2 \
    | cut -f2 > "$SORTED_LIST"
mv "$SORTED_LIST" "$FILE_LIST"

# ---------------------------------------------------------------------------
# Counts for summary
# ---------------------------------------------------------------------------
SELECTED_COUNT=$(wc -l < "$FILE_LIST")

# ---------------------------------------------------------------------------
# Write header + selection summary
# ---------------------------------------------------------------------------
{
    echo "# LearnIO Project Code Dump"
    echo "Generated: $(date)"
    echo ""
    echo "## Selection Summary"
    echo ""
    if [[ ${#AREAS[@]} -gt 0 ]]; then
        echo "- **Areas:** ${AREAS[*]}"
    else
        echo "- **Areas:** (all)"
    fi
    if [[ ${#INCLUDE_PATHS[@]} -gt 0 ]]; then
        echo "- **Path filters:** ${INCLUDE_PATHS[*]}"
    fi
    if [[ ${#USER_EXCLUDES[@]} -gt 0 ]]; then
        echo "- **Extra excludes:** ${USER_EXCLUDES[*]}"
    fi
    if [[ ${#EXT_FILTER[@]} -gt 0 ]]; then
        echo "- **Extensions:** ${EXT_FILTER[*]}"
    elif [[ ${#INCLUDE_PATTERNS[@]} -eq 0 ]]; then
        echo "- **Extensions:** ${DEFAULT_EXTS[*]} (defaults)"
    else
        echo "- **Extensions:** (all within selected areas)"
    fi
    if [[ -n "$SLICE_MODE" ]]; then
        case "$SLICE_MODE" in
            head)  echo "- **Slicing:** first $SLICE_N lines per file" ;;
            tail)  echo "- **Slicing:** last $SLICE_N lines per file" ;;
            range) echo "- **Slicing:** lines $SLICE_A–$SLICE_B per file" ;;
        esac
    else
        echo "- **Slicing:** full files"
    fi
    if [[ -n "$MAX_FILES" ]]; then
        echo "- **Max files:** $MAX_FILES"
    fi
    if [[ -n "$MAX_BYTES" ]]; then
        echo "- **Max bytes:** $MAX_BYTES"
    fi
    echo "- **Files selected:** $SELECTED_COUNT"
    if $LIST_ONLY; then
        echo "- **Mode:** list only (no code)"
    fi
    echo ""
} > "$TEMP_FILE"

# ---------------------------------------------------------------------------
# Compact project overview (always included for agent context)
# ---------------------------------------------------------------------------
{
    echo "## Project Overview"
    echo ""
    echo "LearnIO is a Next.js (App Router) project integrated with Google AI Studio."
    echo "It uses Tailwind CSS, Lucide React, and Framer Motion for the UI."
    echo ""
    echo "| Area | Path | Description |"
    echo "|------|------|-------------|"
    echo "| **app** | app/ | Next.js App Router (pages, layout, api) |"
    echo "| **components** | components/ | React UI components (shadcn/ui style) |"
    echo "| **lib** | lib/ | Shared utilities and helper functions |"
    echo "| **hooks** | hooks/ | Custom React hooks |"
    echo "| **docs** | *.md | Migration, AI working guide, README |"
    echo ""
    echo "Key paths: \`app/page.tsx\` (main UI), \`app/layout.tsx\` (root wrapper), \`AI_WORKING_GUIDE.md\`"
    echo "Stack: Next.js 15, React 19, Tailwind CSS 4, Google GenAI SDK"
    echo ""
    echo "To dump specific code for chat context, run:"
    echo "\`\`\`bash"
    echo "./printcode.sh --help                              # see all options"
    echo "./printcode.sh --area backend --ext py --head 120  # backend Python, first 120 lines"
    echo "./printcode.sh --list --area docs                  # just list doc files"
    echo "\`\`\`"
    echo ""
} >> "$TEMP_FILE"

# ---------------------------------------------------------------------------
# Project structure section
# ---------------------------------------------------------------------------
if $SHOW_STRUCTURE; then
    echo "## Project Structure" >> "$TEMP_FILE"
    echo '```' >> "$TEMP_FILE"
    if [[ ${#INCLUDE_PATTERNS[@]} -gt 0 ]] || [[ ${#EXT_FILTER[@]} -gt 0 ]] || [[ ${#USER_EXCLUDES[@]} -gt 0 ]]; then
        # Show only selected/filtered files in structure
        cat "$FILE_LIST" >> "$TEMP_FILE"
    else
        # Show full tree (original behavior)
        find "$PROJECT_ROOT" -type f \
            "${FIND_EXCLUDES[@]}" \
            2>/dev/null \
            | sed "s|$PROJECT_ROOT/||" \
            | sort >> "$TEMP_FILE"
    fi
    echo '```' >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
fi

# ---------------------------------------------------------------------------
# If --list mode, we are done (no code blocks)
# ---------------------------------------------------------------------------
if $LIST_ONLY; then
    # In list mode, just output the temp file directly
    total_lines=$(wc -l < "$TEMP_FILE")
    echo "Total lines: $total_lines (list-only mode)"

    # Remove old dump files
    rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md
    rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}[0-9]*

    cp "$TEMP_FILE" "$PROJECT_ROOT/${OUTPUT_PREFIX}00.md"
    echo "Done! Created:"
    ls -la "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md 2>/dev/null || echo "No files created"
    exit 0
fi

# ---------------------------------------------------------------------------
# Source files section
# ---------------------------------------------------------------------------
echo "## Source Files" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

while IFS= read -r rel_path; do
    file="$PROJECT_ROOT/$rel_path"
    [[ -f "$file" ]] || continue

    ext="${rel_path##*.}"
    lang=$(lang_for_ext "$ext")
    total_file_lines=$(wc -l < "$file")

    # Build slice header annotation
    slice_note=""
    case "$SLICE_MODE" in
        head)  slice_note=" (first $SLICE_N lines of $total_file_lines)" ;;
        tail)  slice_note=" (last $SLICE_N lines of $total_file_lines)" ;;
        range) slice_note=" (lines ${SLICE_A}–${SLICE_B} of $total_file_lines)" ;;
    esac

    echo "### ${rel_path}${slice_note}" >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
    echo "\`\`\`$lang" >> "$TEMP_FILE"

    # Output content (full or sliced)
    case "$SLICE_MODE" in
        head)
            sed -n "1,${SLICE_N}p" "$file" >> "$TEMP_FILE"
            ;;
        tail)
            tail -n "$SLICE_N" "$file" >> "$TEMP_FILE"
            ;;
        range)
            sed -n "${SLICE_A},${SLICE_B}p" "$file" >> "$TEMP_FILE"
            ;;
        *)
            cat "$file" >> "$TEMP_FILE"
            ;;
    esac

    echo "" >> "$TEMP_FILE"
    echo "\`\`\`" >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
done < "$FILE_LIST"

# ---------------------------------------------------------------------------
# MiraK microservice dump (c:/mirak — separate repo)
# ---------------------------------------------------------------------------
MIRAK_DIR="/c/mirak"
if [[ -d "$MIRAK_DIR" ]]; then
    echo "## MiraK Microservice (c:/mirak)" >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
    echo "MiraK is a Python/FastAPI research agent on Cloud Run. Separate repo, integrated via webhooks." >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"

    MIRAK_FILES=(
        "main.py"
        "Dockerfile"
        "requirements.txt"
        "knowledge.md"
        "mirak_gpt_action.yaml"
        "README.md"
    )

    for mf in "${MIRAK_FILES[@]}"; do
        mirak_file="$MIRAK_DIR/$mf"
        if [[ -f "$mirak_file" ]]; then
            ext="${mf##*.}"
            lang=$(lang_for_ext "$ext")
            echo "### mirak/${mf}" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
            echo "\`\`\`$lang" >> "$TEMP_FILE"
            cat "$mirak_file" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
            echo "\`\`\`" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
        fi
    done
fi

# ---------------------------------------------------------------------------
# Split into dump files
# ---------------------------------------------------------------------------
total_lines=$(wc -l < "$TEMP_FILE")

if [[ -z "$LINES_PER_FILE" ]]; then
    TARGET_LINES=8000
    if (( total_lines > (TARGET_LINES * MAX_DUMP_FILES) )); then
        # Too big for 10 files at 8k lines each -> increase chunk size to fit exactly 10 files
        LINES_PER_FILE=$(( (total_lines + MAX_DUMP_FILES - 1) / MAX_DUMP_FILES ))
    else
        # Small enough -> use fixed 8k chunk size (resulting in 1-10 files)
        LINES_PER_FILE=$TARGET_LINES
    fi
fi

echo "Total lines: $total_lines"
echo "Lines per file: $LINES_PER_FILE (targeting $MAX_DUMP_FILES files)"
echo "Files selected: $SELECTED_COUNT"

# Remove old dump files
rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md
rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}[0-9]*

# Split (use 2-digit suffix)
split -l "$LINES_PER_FILE" -d -a 2 "$TEMP_FILE" "$PROJECT_ROOT/${OUTPUT_PREFIX}"

# Rename to .md and remove empty files
for f in "$PROJECT_ROOT"/${OUTPUT_PREFIX}*; do
    if [[ ! "$f" =~ \.md$ ]]; then
        if [[ -s "$f" ]]; then
            mv "$f" "${f}.md"
        else
            rm -f "$f"
        fi
    fi
done

echo "Done! Created:"
ls -la "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md 2>/dev/null || echo "No files created"

```

### public/openapi.yaml

```yaml
openapi: 3.1.0
info:
  title: Mira Studio API
  description: Gateway for the Mira experience engine and Goal OS. GPT operations go through 6 endpoints.
  version: 2.1.0
servers:
  - url: https://mira-maddyup.vercel.app/  
    description: Mira Studio Backend

paths:
  /api/gpt/state:
    get:
      operationId: getGPTState
      summary: Get user state on re-entry
      description: Returns compressed state with active experiences, re-entry prompts, friction signals, knowledge summary, and curriculum progress. Call this first on every conversation.
      parameters:
        - name: userId
          in: query
          required: false
          schema:
            type: string
            default: "a0000000-0000-0000-0000-000000000001"
          description: User ID. Defaults to the dev user.
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  latestExperiences:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  activeReentryPrompts:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  frictionSignals:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  suggestedNext:
                    type: array
                    items:
                      type: string
                  proposedExperiences:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  knowledgeSummary:
                    type: object
                    nullable: true
                    additionalProperties: true
                  goal:
                    type: object
                    nullable: true
                    additionalProperties: true
                  skill_domains:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  curriculum:
                    type: object
                    properties:
                      active_outlines:
                        type: array
                        items:
                          type: object
                          additionalProperties: true
                      recent_completions:
                        type: array
                        items:
                          type: object
                          additionalProperties: true

  /api/gpt/plan:
    post:
      operationId: planCurriculum
      summary: Scoping and planning operations
      description: Create curriculum outlines, dispatch research, or assess learning gaps before generating experiences.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [action]
              properties:
                action:
                  type: string
                  enum: [create_outline, dispatch_research, assess_gaps]
                  description: The planning action to perform.
                topic:
                  type: string
                  description: The learning topic (required for create_outline and dispatch_research).
                domain:
                  type: string
                  description: Optional broad domain grouping.
                subtopics:
                  type: array
                  items:
                    type: object
                    properties:
                      title:
                        type: string
                      description:
                        type: string
                      order:
                        type: integer
                  description: Optional subtopic breakdown for create_outline.
                pedagogicalIntent:
                  type: string
                  enum: [build_understanding, develop_skill, explore_concept, problem_solve]
                  description: The learning intent.
                outlineId:
                  type: string
                  description: Required for assess_gaps. The outline to analyze.
                goalId:
                  type: string
                  description: Optional. Links the outline to a goal. If provided, auto-activates the goal.
                userId:
                  type: string
                  default: "a0000000-0000-0000-0000-000000000001"
      responses:
        '200':
          description: Success
        '201':
          description: Outline created
        '400':
          description: Validation error

  /api/gpt/create:
    post:
      operationId: createEntity
      summary: Create experiences, ideas, or steps
      description: |
        Discriminated by `type`. Call GET /api/gpt/discover?capability=create_experience for full payload schema.
        All fields except `type` are the creation payload.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [type]
              properties:
                type:
                  type: string
                  enum: [experience, ephemeral, idea, step, goal]
                  description: The entity type to create.
                templateId:
                  type: string
                  description: UUID of the experience template. Call discover?capability=templates for valid IDs.
                userId:
                  type: string
                  default: "a0000000-0000-0000-0000-000000000001"
                title:
                  type: string
                  description: Title of the experience, idea, or step.
                goal:
                  type: string
                  description: Goal or purpose of the experience.
                resolution:
                  type: object
                  properties:
                    depth:
                      type: string
                      enum: [light, medium, heavy]
                    mode:
                      type: string
                      enum: [illuminate, practice, challenge, build, reflect, study]
                    timeScope:
                      type: string
                      enum: [immediate, session, multi_day, ongoing]
                    intensity:
                      type: string
                      enum: [low, medium, high]
                reentry:
                  type: object
                  properties:
                    trigger:
                      type: string
                      enum: [completion, inactivity, explicit]
                    prompt:
                      type: string
                    contextScope:
                      type: string
                      enum: [interaction_only, full_synthesis, interaction_and_synthesis]
                steps:
                  type: array
                  items:
                    type: object
                    properties:
                      type:
                        type: string
                        enum: [lesson, challenge, reflection, questionnaire, essay_tasks, plan_builder, checkpoint]
                      title:
                        type: string
                      payload:
                        type: object
                        additionalProperties: true
                        description: Step-specific payload. Call discover?capability=step_payload&step_type=X for the exact shape.
                  description: Array of steps for the experience.
                curriculum_outline_id:
                  type: string
                  description: Optional. Links to a curriculum outline.
                previousExperienceId:
                  type: string
                  description: Optional. Links to a prior experience for chaining.
                rawPrompt:
                  type: string
                  description: For ideas — the raw user prompt.
                gptSummary:
                  type: string
                  description: For ideas — GPT's summary of the concept.
                instanceId:
                  type: string
                  description: For steps — the experience instance to add the step to.
      responses:
        '201':
          description: Created
        '400':
          description: Validation error

  /api/gpt/update:
    post:
      operationId: updateEntity
      summary: Edit steps, transition status, link knowledge
      description: |
        Discriminated by `action`. All fields except `action` are the mutation payload.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [action]
              properties:
                action:
                  type: string
                  enum: [update_step, reorder_steps, delete_step, transition, link_knowledge]
                  description: The mutation action to perform.
                experienceId:
                  type: string
                  description: The experience instance ID (required for transition, reorder, delete).
                transitionAction:
                  type: string
                  enum: [approve, publish, activate, start, complete, archive]
                  description: For action=transition — the lifecycle transition to apply.
                stepId:
                  type: string
                  description: For action=update_step or delete_step — the step to modify.
                stepPayload:
                  type: object
                  additionalProperties: true
                  description: For action=update_step — the updated step payload.
                stepOrder:
                  type: array
                  items:
                    type: string
                  description: For action=reorder_steps — array of step IDs in desired order.
                knowledgeUnitId:
                  type: string
                  description: For action=link_knowledge — the knowledge unit to link.
                linkType:
                  type: string
                  enum: [teaches, tests, deepens, pre_support, enrichment]
                  description: For action=link_knowledge — the type of link.
      responses:
        '200':
          description: Updated
        '400':
          description: Validation error

  /api/gpt/changes:
    get:
      operationId: getChangeReports
      summary: View user-reported UI/UX changes and bugs
      description: Returns all open feedback, bugs, and change requests reported by the user via the Changes floater. Use this to help the user scope the next version, track UI issues, or answer questions about the app's current state. Includes the exact URL/page they were on when they reported it.
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  changes:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        type:
                          type: string
                          enum: [bug, ux, idea, change, comment]
                        url:
                          type: string
                        content:
                          type: string
                        status:
                          type: string
                          enum: [open, resolved]
                        createdAt:
                          type: string
        '500':
          description: Server Error

  /api/gpt/discover:
    get:
      operationId: discoverCapability
      summary: Learn schemas and valid values at runtime
      description: Progressive disclosure — ask how to perform any action and get the exact schema, examples, and related capabilities.
      parameters:
        - name: capability
          in: query
          required: true
          schema:
            type: string
          description: "The capability to learn about. Examples: templates, create_experience, step_payload, resolution, create_outline, dispatch_research, goal"
        - name: step_type
          in: query
          required: false
          schema:
            type: string
          description: "Optional filter for step_payload (e.g. lesson, checkpoint, challenge)"
      responses:
        '200':
          description: Schema, examples, and usage guidance
          content:
            application/json:
              schema:
                type: object
                properties:
                  capability:
                    type: string
                  endpoint:
                    type: string
                  description:
                    type: string
                  schema:
                    type: object
                    nullable: true
                    additionalProperties: true
                  example:
                    type: object
                    nullable: true
                    additionalProperties: true
                  when_to_use:
                    type: string
        '400':
          description: Unknown capability (returns list of valid capabilities)

  /api/knowledge:
    get:
      operationId: readKnowledge
      summary: Read knowledge base content
      description: Returns full knowledge units with content, thesis, key ideas, and metadata. Use this to read research results and reference them when building experiences.
      parameters:
        - name: domain
          in: query
          required: false
          schema:
            type: string
          description: Filter by domain (e.g. "AI Business Strategy", "SaaS Strategy")
        - name: topic
          in: query
          required: false
          schema:
            type: string
          description: Filter by topic
      responses:
        '200':
          description: Knowledge units grouped by domain
          content:
            application/json:
              schema:
                type: object
                properties:
                  units:
                    type: object
                    description: Units grouped by domain
                    additionalProperties:
                      type: array
                      items:
                        type: object
                        properties:
                          id:
                            type: string
                          title:
                            type: string
                          thesis:
                            type: string
                          content:
                            type: string
                            description: Full research content — read this to understand the topic deeply
                          key_ideas:
                            type: array
                            items:
                              type: string
                          unit_type:
                            type: string
                            enum: [foundation, playbook]
                          topic:
                            type: string
                          domain:
                            type: string
                  total:
                    type: integer
                  domains:
                    type: object
                    additionalProperties:
                      type: integer

```

### roadmap.md

```markdown
# Mira Studio — Product Roadmap

> Living document. The vision is large; the sprints are small.

---

## Core Thesis

**Mira is a system that generates temporary realities for the user to live inside.**

The user talks to a Custom GPT. The GPT proposes *Experiences* — structured, typed modules that the user lives through inside the app. A coding agent *realizes* those experiences against typed schemas and pushes them through a review pipeline. Supabase is the canonical runtime memory. GitHub is the realization substrate. The frontend renders experiences from schema, not from hardcoded pages.

The central noun is **Experience**, not PR, not Issue, not Project.

Sometimes the system explains why it's creating an experience. Sometimes it just drops you in. The **resolution object** controls which.

---

## The Paradigm Shift: Multi-Agent Experience Engine

Mira is actively moving away from the saturated "AI Chatbot" space (which suffers from "chat contamination") and into a **Multi-Agent Experience Engine**. It acts as an orchestrator: taking messy human intent (via Custom GPT), mapping it into a durable structured workspace (the App + Supabase), and tagging in heavy-lifters (the Genkit internal intelligence layer or GitHub SWE Coder) when complexity exceeds text generation.

### High-Impact Modes
1. **The "Zero-to-One" Project Incubator**: Takes a messy brain-dump, scaffolds a structured multi-phase experience, and escalates to a SWE agent to build live infrastructure (e.g., scaffolding a Next.js landing page).
2. **Adaptive Deep-Learning**: Multi-pass construction of daily educational modules (Education, Challenge, Reflection) with hybrid escalation (e.g., inline live tutoring inside a broken repo).
3. **Cognitive & Executive Scaffolding**: Avoids heavy task lists for overwhelmed users. Heavy reliance on ephemeral experiences, synthesis snapshots, and proactive low-friction state reconstruction.

---

## Where We Are Today

### ✅ Sprint 1 — Local Control Plane (Complete)

Idea capture, 6-step drill, promote/ship lifecycle, JSON file persistence via `lib/storage.ts` → `.local-data/studio.json`, inbox events, dev harness.

### ✅ Sprint 2 — GitHub Factory (Complete, Lane 6 integration pending)

Real Octokit adapter (`lib/adapters/github-adapter.ts`), signature-verified webhook pipeline (`lib/github/`), issue creation, PR creation, coding agent assignment (Copilot), workflow dispatch, factory/sync services, action upgrades with GitHub-aware state machine. Lanes 1–5 all TSC-clean. Lane 6 (integration proof) still open.

### ✅ Sprint 3 — Foundation Pivot: DB + Experience Types (Complete)

Supabase is live (project `bbdhhlungcjqzghwovsx`). 16 Mira-specific tables deployed. Storage adapter pattern in place (`lib/storage-adapter.ts`) with JSON fallback. Experience type system (`types/experience.ts`, `types/interaction.ts`, `types/synthesis.ts`), experience state machine, services (experience, interaction, synthesis), and all API routes operational. GPT re-entry endpoint (`/api/gpt/state`) returns compressed state packets. 6 Tier 1 templates seeded. Dev user seeded. All verification criteria pass.

### ✅ Sprint 4 — Experience Renderer + Library (Complete)

Renderer registry (`lib/experience/renderer-registry.tsx`), workspace page (`/workspace/[instanceId]`), library page (`/library`), experience cards, step renderers (Questionnaire, Lesson, Challenge, Plan Builder, Reflection, Essay+Tasks), interaction recording via `useInteractionCapture` hook, resolution-driven chrome levels, re-entry engine, persistent experience lifecycle (proposed → active → completed), and home page surfaces for active/proposed experiences. All verification criteria pass.

### ✅ Sprint 5B — Experience Workspace Hardening (Complete)

Field-tested the 18-step "AI Operator Brand" experience and exposed 10 hard failures (R1–R10). Built contracts (Gate 0), experience graph, timeline, profile, validators, and progression engine across 6 parallel lanes.

### ✅ Sprint 6 — Experience Workspace: Navigation, Drafts, Renderers, Steps API, Scheduling (Complete)

Transformed experiences from linear form-wizards into navigable workspaces. R1–R10 upgrades shipped:
- **R1** Non-linear step navigation — sidebar (heavy), top bar (medium), hidden (light)
- **R2** Checkpoint text input — lessons with writing prompts now render textareas
- **R3** Essay writing surface — per-task textareas with word counts
- **R4** Expandable challenge workspaces — objectives expand into mini-workspaces
- **R5** Plan builder notes — items expand to show detail areas
- **R6** Multi-pass enrichment — step CRUD, reorder, insert APIs for GPT to update steps after creation
- **R9** Experience overview dashboard — visual grid of all steps with progress stats
- **R10** Draft persistence — auto-save to artifacts table, hydration on revisit, "Last saved" indicator
- **Migration 004** — step status, scheduled_date, due_date, estimated_minutes, completed_at on experience_steps
- **OpenAPI schema updated** — 5 new endpoints: step CRUD, reorder, progress, drafts

### ✅ Sprint 7 — Genkit Intelligence Layer (Complete)

Replaced naive string summaries and keyword-splitting with AI-powered intelligence via Genkit + Gemini 2.5 Flash:
- **Intelligent Synthesis** — `synthesizeExperienceFlow` extracts narrative summary, behavioral signals, friction assessment, and next candidates from experience interactions
- **Smart Facet Extraction** — `extractFacetsFlow` semantically identifies interests, skills, goals, preferred modes, depth preferences, and friction patterns with confidence scores and evidence strings
- **Context-Aware Suggestions** — `suggestNextExperienceFlow` produces personalized next-experience recommendations based on user profile, completion history, and friction level
- **GPT State Compression** — `compressGPTStateFlow` condenses the raw GPT state packet into a token-efficient narrative with priority signals and a suggested opening topic
- **Completion Wiring** — `completeExperienceWithAI()` orchestrates synthesis + facet extraction + friction update on every experience completion
- **Graceful Degradation** — `runFlowSafe()` wrapper ensures all AI flows fall back to existing mechanical behavior when `GEMINI_API_KEY` is unavailable
- **Migration 005** — `evidence` column added to `profile_facets` for AI-generated extraction justification

### 🟢 Board Truth — Sprint Completion Status

| Sprint | Status | What Shipped |
|--------|--------|------|
| Sprints 1–9 | ✅ Complete | Local control plane, GitHub factory, Supabase foundation, experience renderer + library, workspace hardening (R1-R10), genkit intelligence (4 flows), knowledge tab + MiraK integration, content density + agent thinking rails |
| Sprint 10 | ✅ Complete | Curriculum-aware experience engine: curriculum outlines (table + service + types), GPT gateway (5 endpoints: state/plan/create/update/discover), discover registry (9 capabilities), coach API (3 routes), Genkit tutor + grading flows, step-knowledge-link service, OpenAPI rewrite, migration 007 |
| Sprint 11 | ✅ Complete | MiraK enrichment loop: enrichment webhook mode (experience_id), flat OpenAPI for GPT Actions, Cloud Run stabilization, readKnowledge endpoint, gateway payload tolerance. |
| Sprint 12 | ✅ Complete | Learning Loop Productization: Visible Track UI, Checkpoint renderer, Coach Triggers, Synthesis Completion, Pre/In/Post Knowledge. The "three emotional moments" are fully functional. |
| Sprint 13 | ✅ Complete | Goal OS + Skill Map: Goal entity, skill domains array, mastery computation engine, deep intake protocol mapping. |
| Sprint 14 | ✅ Complete | Mastery Visibility & Intelligence Wiring: Skill Tree UI completion, Profile synthesis integration, Coach contextual triggers. |
| Sprint 15 | ✅ Complete | Chained Experiences + Spontaneity: Experience graph wiring, ephemeral injection, Re-entry hardening, Timeline feed upgrades. |

### 🔄 Current Phase — Coder Pipeline (Sprint 16+)

The curriculum infrastructure and learning loops are now fully productized, visible, and functioning. The system can plan a curriculum, link knowledge, render checkpoints, provide coaching, and celebrate synthesis natively in the browser.

The next structural challenge is **Containerization**: Users need a top-level anchor for their multi-week journeys. Right now, curricula float freely. The **Goal OS** will introduce the "Goal" entity as the highest-level object, grouping curriculum tracks, knowledge domains, and timeline events into coherent, long-term operating systems.

The GPT Custom instructions and OpenAPI schema are defined in `gpt-instructions.md` / `public/openapi.yaml`. The app runs on `localhost:3000` with a Cloudflare tunnel at `https://mira.mytsapi.us`. The GPT has 6 endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/gpt/state` | GET | User state, active experiences, curriculum progress, friction signals, re-entry prompts |
| `/api/gpt/plan` | POST | Curriculum outlines, research dispatch, gap assessment |
| `/api/gpt/create` | POST | Experiences (persistent/ephemeral), ideas, steps |
| `/api/gpt/update` | POST | Step edits, reorder, transitions, knowledge linking |
| `/api/gpt/discover` | GET | Progressive disclosure — schemas, examples, valid values |
| `/api/knowledge` | GET | Read full knowledge base content |

Additionally, MiraK is a separate GPT Action (`POST /generate_knowledge`) for fire-and-forget deep research.

### What the product can actually do today

**Already built and functional:**
- Curriculum-aware planning (outlines → subtopics → linked experiences)
- GPT gateway with progressive discovery (9 capabilities, flat payloads)
- Coach/tutor API (contextual Q&A, semantic checkpoint grading)
- Knowledge enrichment into existing experiences (MiraK → webhook → step appending + knowledge linking)
- Knowledge reading via GPT (`readKnowledge` endpoint)
- Experience enrichment via `experience_id` passthrough
- Step-knowledge links (teaches/tests/deepens/pre_support/enrichment types)
- Curriculum outline service with gap assessment
- 4 Genkit intelligence flows (synthesis, facets, suggestions, GPT compression)
- 2 Genkit tutor flows (tutor chat, checkpoint grading)
- Knowledge enrichment flow (refine-knowledge-flow)
- Non-linear workspace navigation, draft persistence, step scheduling
- 6 step renderers (lesson, challenge, reflection, questionnaire, plan_builder, essay_tasks)
- MiraK 3-stage research pipeline (strategist + 3 readers + synthesizer + playbook builder)

**Operational close pending (Sprint 11):**
- MiraK Cloud Run redeploy with enrichment code
- Vercel deploy (git push)
- GPT Action schema update in ChatGPT settings
- End-to-end production enrichment verification

**Newly Productized (Sprint 12):**
- Visible curriculum tracks and outline UI (`/library` and home page)
- "Your Path" and "Focus Today" on the home page
- Research status visibility (pending/in-progress/landed)
- Synthesis and growth feedback on experience completion (CompletionScreen)
- Visible knowledge timing inside steps (pre-support, in-step, post-step cards)
- Checkpoint step renderer with semantic grading
- Proactive coach surfacing triggers on failed checkpoints or high dwell time
- Mastery automatically earned/promoted through semantic checkpoint grading
- Welcome-back session reconstruction context on the home page

This successfully bridges the intelligence layer into the felt UX. The next gap is containerization (Goal OS).

### Current Architecture

```
Custom GPT ("Mira" — persona + 6 endpoints + MiraK action)
  ↓ Flat OpenAPI (gateway + progressive discovery)
  ↓ via Cloudflare tunnel (mira.mytsapi.us) or Vercel (mira-maddyup.vercel.app)
Mira Studio (Next.js 14, App Router)
  ├── workspace/    ← navigable experience workspace (overview + step grid + sidebar/topbar)
  ├── knowledge/    ← durable reference + mastery (3-tab: Learn | Practice | Links)
  ├── library/      ← all experiences: active, completed, proposed
  ├── timeline/     ← chronological event feed
  ├── profile/      ← compiled user direction (AI-powered facets)
  └── api/
        ├── gpt/     ← 5 gateway endpoints (state/plan/create/update/discover)
        ├── coach/   ← 3 frontend-facing routes (chat/grade/mastery)
        ├── webhook/ ← GPT, GitHub, Vercel, MiraK receivers
        └── */*      ← existing CRUD routes (experiences, knowledge, etc.)
        ↕
Genkit Intelligence Layer (7 flows)
  ├── synthesize-experience-flow     → narrative + behavioral signals on completion
  ├── suggest-next-experience-flow   → personalized recommendations
  ├── extract-facets-flow            → semantic profile facet mining
  ├── compress-gpt-state-flow       → token-efficient GPT state packets
  ├── refine-knowledge-flow          → polish + cross-pollinate MiraK output
  ├── tutor-chat-flow               → contextual Q&A within active step
  └── grade-checkpoint-flow          → semantic grading of checkpoint answers
        ↕
MiraK (Python/FastAPI on Cloud Run — c:/mirak)
  ├── POST /generate_knowledge → 202 Accepted immediately
  ├── 3-stage pipeline: strategist (search+scrape) → 3 readers → synthesizer + playbook
  ├── Webhook delivery: local tunnel primary → Vercel fallback
  └── Enrichment mode: experience_id → enrich existing experience
        ↕
Supabase (runtime truth — 18+ tables)
  ├── experience_instances  (lifecycle state machine, curriculum_outline_id)
  ├── experience_steps      (per-step payload + status + scheduling)
  ├── curriculum_outlines   (topic scoping, subtopic tracking)
  ├── step_knowledge_links  (step ↔ knowledge unit connections)
  ├── knowledge_units       (research content from MiraK)
  ├── knowledge_progress    (mastery tracking per user per unit)
  ├── interaction_events    (telemetry: 7 event types)
  ├── synthesis_snapshots   (AI-enriched completion analysis)
  ├── profile_facets        (interests, skills, goals, preferences)
  ├── artifacts             (draft persistence)
  ├── timeline_events       (inbox/event feed)
  └── experience_templates  (6 Tier 1 seeded)
        ↕
GitHub (realization substrate — deferred)
  ├── webhook at /api/webhook/github
  └── factory services ready but not in active use
```

### Two Parallel Truths

| Layer | Source of Truth | What It Stores |
|-------|---------------|----------------|
| **Runtime truth** | Supabase | What the user saw, clicked, answered, completed, skipped. Experience state, interaction events, artifacts produced, synthesis snapshots, profile facets. |
| **Realization truth** | GitHub | What the coder built or changed. Issues, PRs, workflow runs, check results, release history. |

The app reads runtime state from Supabase and realization state from GitHub. Neither replaces the other.

---

## Key Concepts

### The Resolution Object

Every experience carries a resolution that makes it intentional rather than arbitrary.

```ts
resolution = {
  depth:      'light' | 'medium' | 'heavy'
  mode:       'illuminate' | 'practice' | 'challenge' | 'build' | 'reflect'
  timeScope:  'immediate' | 'session' | 'multi_day' | 'ongoing'
  intensity:  'low' | 'medium' | 'high'
}
```

The resolution controls:
- What the renderer shows (light = minimal chrome, heavy = full scaffolding)
- How the coder authors the experience (depth + mode = spec shape)
- Whether GPT explains why or just drops you in (light+immediate = immerse, heavy+ongoing = explain)
- How chaining works (light chains to light, heavy chains to progression)

Stored on `experience_instances.resolution` (JSONB).

### GPT Entry Modes

Controlled by resolution, not hardcoded:

| Resolution Profile | GPT Behavior | User Experience |
|-------------------|-------------|----------------|
| `depth: light`, `timeScope: immediate` | Drops you in, no explanation | World you step into |
| `depth: medium`, `timeScope: session` | Brief framing, then in | Teacher with context |
| `depth: heavy`, `timeScope: multi_day` | Full rationale + preview | Guided curriculum |

This is NOT a boolean. It's a spectrum driven by the resolution object.

### Persistent vs. Ephemeral Experiences

| Dimension | Persistent | Ephemeral |
|-----------|-----------|-----------|
| Pipeline | Proposal → Realization → Review → Publish | GPT creates directly via endpoint |
| Storage | Full instance + steps + events | Instance record + events (lightweight) |
| Review | Required before going live | Skipped — instant render |
| Lifespan | Long-lived, revisitable | Momentary, archivable |
| Examples | Course, plan builder, research sprint | "Write 3 hooks now", "React to this trend", "Try this one thing today" |

Ephemeral experiences add **soft spontaneity** — interruptions, nudges, micro-challenges that make the system feel alive rather than pipeline-like.

```ts
experience_instances.instance_type = 'persistent' | 'ephemeral'
```

Rules:
- Ephemeral skips the realization pipeline entirely
- GPT can create ephemeral experiences directly via endpoint
- Frontend renders them instantly
- Still logs interaction events (telemetry is never skipped)
- Can be upgraded to persistent if the user wants to return

### The Re-Entry Contract

Every experience defines how it creates its own continuation.

```ts
reentry = {
  trigger:      'time' | 'completion' | 'inactivity' | 'manual'
  prompt:       string   // what GPT should say/propose next
  contextScope: 'minimal' | 'full' | 'focused'
}
```

Stored on `experience_instances.reentry` (JSONB).

Examples:
- After a challenge: `{ trigger: "completion", prompt: "reflect on what surprised you", contextScope: "focused" }`
- After a plan builder: `{ trigger: "time", prompt: "check in on milestone progress in 3 days", contextScope: "full" }`
- After an ephemeral: `{ trigger: "manual", prompt: "want to go deeper on this?", contextScope: "minimal" }`

Without re-entry contracts, GPT re-entry is generic. With them, every experience creates its own continuation thread.

### Experience Graph

Lightweight linking — no graph DB needed. Just two fields on `experience_instances`:

```ts
previous_experience_id:   string | null
next_suggested_ids:       string[]
```

This unlocks:
- **Chaining:** Questionnaire → Plan Builder → Challenge
- **Loops:** Weekly reflection → same template, new instance
- **Branching:** "You could do A or B next"
- **Backtracking:** "Return to where you left off"

---

## Entity Model

### Core Experience Entities

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| `experience_templates` | Reusable shapes the system can render | `id`, `slug`, `name`, `class`, `renderer_type`, `schema_version`, `config_schema`, `status` |
| `experience_instances` | Actual generated experience for a user | `id`, `user_id`, `idea_id`, `template_id`, `title`, `goal`, `instance_type` (persistent/ephemeral), `status`, `resolution` (JSONB), `reentry` (JSONB), `previous_experience_id`, `next_suggested_ids` (JSONB), `friction_level`, `source_conversation_id`, `generated_by`, `realization_id`, `created_at`, `published_at` |
| `experience_steps` | What the user sees/does within an experience | `id`, `instance_id`, `step_order`, `step_type`, `title`, `payload` (JSONB), `completion_rule` |
| `interaction_events` | Raw telemetry — no interpretation | `id`, `instance_id`, `step_id`, `event_type`, `event_payload` (JSONB), `created_at` |
| `artifacts` | Anything the user produces during an experience | `id`, `instance_id`, `artifact_type`, `title`, `content`, `metadata` (JSONB) |
| `synthesis_snapshots` | Compressed packets for GPT re-entry | `id`, `user_id`, `source_type`, `source_id`, `summary`, `key_signals` (JSONB), `next_candidates` (JSONB), `created_at` |
| `profile_facets` | Structured long-lived user direction | `id`, `user_id`, `facet_type`, `value`, `confidence`, `source_snapshot_id`, `updated_at` |

### Preserved Entities (migrated from JSON → Supabase)

| Entity | Current Location | Migration |
|--------|-----------------|-----------| 
| `ideas` | `.local-data/studio.json` | Move to Supabase `ideas` table |
| `projects` | `.local-data/studio.json` | Evolve into `realizations` table |
| `tasks` | `.local-data/studio.json` | Fold into `experience_steps` or keep as `realization_tasks` |
| `prs` | `.local-data/studio.json` | Evolve into `realization_reviews` table |
| `inbox` | `.local-data/studio.json` | Evolve into `timeline_events` table |
| `drill_sessions` | `.local-data/studio.json` | Move to Supabase `drill_sessions` table |
| `agent_runs` | `.local-data/studio.json` | Move to Supabase `agent_runs` table |
| `external_refs` | `.local-data/studio.json` | Move to Supabase `external_refs` table |

### New Supporting Entities

| Entity | Purpose |
|--------|---------|
| `users` | Single-user now, multi-user ready. Profile anchor. |
| `conversations` | GPT conversation sessions with metadata |
| `realizations` | Internal realization object replacing "project" in code-execution contexts. Not "build" — because we're realizing experiences, not building features. |
| `realization_reviews` | Approval surface. User sees "Approve Experience" — maps internally to PR/realization review. |

### Friction Signal

A computed field on `experience_instances` — **recorded during synthesis only, never interpreted in-app**:

```ts
friction_level: 'low' | 'medium' | 'high' | null
```

Computed from interaction events:
- High skip rate → high friction
- Long dwell + completion → low friction
- Abandonment mid-step → medium/high friction

The app does NOT act on this. GPT reads it during re-entry and adjusts future proposals accordingly.

---

## Experience Classes

### Tier 1 — Ship First

| Class | Renderer | User Sees |
|-------|----------|-----------|
| **Questionnaire** | Multi-step form with branching | Questions → answers → summary |
| **Lesson** | Scrollable content with checkpoints | Sections → reading → knowledge checks |
| **Challenge** | Task list with completion tracking | Objectives → actions → proof |
| **Plan Builder** | Editable structured document | Goals → milestones → resources → timeline |
| **Reflection Check-in** | Prompt → free response → synthesis | Prompts → writing → GPT summary |
| **Essay + Tasks** | Long-form content with embedded tasks | Reading → doing → artifacts |

### Tier 2 — Ship Next

| Class | Example Mapping |
|-------|-----------------|
| **Trend Injection** | "Here's what's happening in X — react" |
| **Research Sprint** | Curated sources → analysis → brief |
| **Social Practice** | Scenarios → responses → feedback |
| **Networking Adventure** | Outreach targets → scripts → tracking |
| **Content Week Planner** | Topics → calendar → production tasks |

### How Ideas Map to Experience Chains

| Idea | Experience Chain | Resolution Profile |
|------|-----------------|-------------------|
| "Make better videos" | Lesson → Content Week Planner → Challenge | `medium / practice / multi_day / medium` |
| "Start a company" | Questionnaire → Plan Builder → Research Sprint | `heavy / build / ongoing / high` |
| "Better social life" | Reflection Check-in → Social Practice → Adventure | `medium / practice / multi_day / medium` |
| "Get a better job" | Questionnaire → Plan Builder → Networking Adventure | `heavy / build / multi_day / high` |
| "Learn options trading" | Lesson → Challenge → Reflection Check-in | `medium / illuminate / session / medium` |
| *GPT micro-nudge* | Ephemeral Challenge | `light / challenge / immediate / low` |
| *Trend alert* | Ephemeral Trend Injection | `light / illuminate / immediate / low` |

---

## Experience Lifecycle

### Persistent Experiences (full pipeline)

```
Phase A: Conversation
  User talks to GPT → GPT fetches state → GPT proposes experience

Phase B: Proposal
  GPT emits typed proposal via endpoint:
    { experienceType, goal, resolution, reentry, sections, taskCount, whyNow }
  → Saved as proposed experience in Supabase (instance_type = 'persistent')

Phase C: Realization
  Coder receives proposal + repo context
  → Creates/instantiates template + frontend rendering
  → Pushes through GitHub if needed (PR, workflow)
  → Creates realization record linking experience to GitHub PR

Phase D: Review
  User sees: Draft → Ready for Review → Approved → Published
  Buttons: Preview Experience · Approve · Request Changes · Publish
  Internal mapping: Draft→PR open, Approve→approval flag, Publish→merge+activate

Phase E: Runtime
  User lives the experience in /workspace
  App records: what shown, clicked, answered, completed, skipped
  → interaction_events + artifacts in Supabase

Phase F: Re-entry
  Re-entry contract fires (on completion, time, inactivity, or manual)
  Next GPT session fetches compressed packet from /api/synthesis:
    latest experiences, outcomes, artifacts, friction signals, re-entry prompts
  → GPT resumes with targeted awareness, not generic memory
```

### Ephemeral Experiences (instant pipeline)

```
GPT calls /api/experiences/inject
  → Creates experience_instance (instance_type = 'ephemeral')
  → Skips realization pipeline entirely
  → Frontend renders instantly
  → Still logs interaction events
  → Re-entry contract can escalate to persistent if user engages deeply
```

---

## User-Facing Approval Language

| Internal State | User Sees | Button |
|---------------|-----------|--------|
| PR open / draft | Drafted | — |
| PR ready | Ready for Review | Preview Experience |
| PR approved | Approved | Publish |
| PR merged + experience activated | Published | — |
| New version supersedes | Superseded | — |
| Changes requested | Needs Changes | Request Changes / Reopen |

---

## Frontend Surface Map

| Surface | Route | Purpose | Status |
|---------|-------|---------|--------|
| **Workspace** | `/workspace/[instanceId]` | Lived experience surface. Renders typed modules. Handles both persistent and ephemeral. | 🔲 New |
| **Library** | `/library` | All experiences: active, completed, paused, suggested, ephemeral history | 🔲 New |
| **Timeline** | `/timeline` | Chronological feed: proposals, realizations, completions, ephemerals, suggestions | 🔲 New (evolves from `/inbox`) |
| **Profile** | `/profile` | Compiled direction view: goals, interests, efforts, patterns | 🔲 New |
| **Review** | `/review/[id]` | Approve/publish experiences (internally maps to PR/realization review) | ✅ Exists, needs language refactor |
| **Send** | `/send` | Idea capture from GPT | ✅ Preserved |
| **Drill** | `/drill` | 6-step idea clarification | ✅ Preserved |
| **Arena** | `/arena` | Active work surface (evolves to show active realizations + experiences) | ✅ Preserved, evolves |
| **Icebox** | `/icebox` | Deferred ideas + experiences | ✅ Preserved |
| **Archive** | `/shipped`, `/killed` | Completed / removed | ✅ Preserved |

---

## Coder-Context Strategy (Deferred — Sprint 8+)

> Directionally correct but not critical path. The experience system, renderer, DB, and re-entry are the priority. Coder intelligence evolves later once there's runtime data to compile from.

Generated markdown summaries derived from DB — not hand-maintained prose:

| File | Source | Purpose |
|------|--------|---------|
| `docs/coder-context/user-profile.md` | `profile_facets` + `synthesis_snapshots` | Who is this user |
| `docs/coder-context/current-goals.md` | Active `experience_instances` + `profile_facets` | What's in flight |
| `docs/coder-context/capability-map.md` | Renderer registry + endpoint contracts | What the system can do |

These are a nice-to-have once the experience loop is running. Do not over-invest here in early sprints.

---

## GitHub Usage Rules

### Use GitHub For
- Implementation work (PRs, branches)
- Workflow runs (Actions)
- Realization validation (checks)
- PR review (approval gate)
- Release history
- Durable realization automation

### Use Issues Only When
- Realization is large and needs decomposition
- Agent assignment / tracking is needed
- Cross-session execution visibility required

### Do NOT Use Issues For
- Every questionnaire or user answer
- Every experience runtime event
- Every content module instance
- Ephemeral experiences (they never touch GitHub)

**Rule: DB for runtime · GitHub for realization lifecycle · Studio UI for human-facing continuity.**

---

## Strategic UX & Utility Upgrades (The "Glass Box")
To make the orchestration transparent and powerful, these UX paradigms guide future development:

1. **The Spatial "Split-Brain" Interface**: A dual-pane UI where the left pane is the "Stream" (ephemeral chat) and the right pane is the "Scaffold" (the durable Workspace). Users watch the GPT extract goals and snap them into beautifully rendered Modules in real-time.
2. **Visualizing the "Multi-Pass" Engine**: Do not hide generation behind spinners. Expose stages dynamically: _"Inferring constraints..."_ → _"Scaffolding timeline..."_ → _"Injecting challenges..."_
3. **The "Glass Box" Profile Surfacing**: An "Inferred Profile" dashboard showing exactly what the system thinks the user's constraints, means, and skill levels are, tightly coupled to the `profile_facets` table. Manual overrides instantly re-align GPT strategy.
4. **Coder Escalation as a Hero Moment**: When the SWE agent is invoked, the UI dims and a "Realization Work" widget appears in plain-English showing real-time GitHub Actions infrastructure being built.
5. **Hidden Scratchpad Actions**: The GPT quietly upserts user insights into Supabase before generating modules, preventing prompt context overload.
6. **Micro-Regeneration**: Ability to highlight a specific module inside an App Workspace and click **"Tune."** Opens a micro-chat only for that module to break it down further.
7. **"Interrupt & Re-Route" Safety Valve**: An unstructured brain-dump button when life derails a plan. The GPT dynamically rewrites remaining runtime state to adapt without inducing failure states.
8. **Escalation Ledger to Template Factory**: Strip PII from highly-used SWE Coder escalations (e.g. "build calendar sync") and turn them into reusable "Starter Kit Modules".

---

## Sprint Roadmap

### ✅ Sprint 1 — Local Control Plane (Complete)

Idea capture, drill, promote, ship lifecycle. Local JSON persistence. Inbox events. Dev harness.

### ✅ Sprint 2 — GitHub Factory (Complete, Lane 6 pending)

Real GitHub API integration. Webhook pipeline. Issue/PR/workflow routes. Agent assignment. Factory/sync services.

### ✅ Sprint 3 — Foundation Pivot: DB + Experience Types (Complete)

Supabase live. 16 Mira tables deployed. Storage adapter pattern. Experience type system. All API routes. GPT re-entry endpoint. 6 templates + dev user seeded.

### ✅ Sprint 4 — Experience Renderer + Library (Complete)

Renderer registry. Workspace page. Library page. 6 step renderers. Interaction recording. Resolution-driven chrome. Re-entry engine. Persistent lifecycle. Home page surfaces.

---

### ✅ Sprint 5 — Data-First Experience Testing (Complete)

> **Goal:** Prove the GPT-created experience loop works. The system must create durable, stateful, action-producing experiences that feel meaningfully better than plain chat.

> **Result:** Structure ✅ State ✅ Behavior ✅ — but field-testing exposed 10 hard renderer failures (Sprint 5B). The GPT authored an excellent 18-step curriculum; the renderers couldn't support it. Led directly to Sprint 6 workspace upgrades.

#### Phase 5A — GPT Connection

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Custom GPT instructions | Written. See `openschema.md` Part 1. Defines Mira's personality, the 6 experience types, step payload formats, re-entry behavior, resolution semantics. |
| 2 | OpenAPI schema | Written. See `openschema.md` Part 2. 7 endpoints: `getGPTState`, `injectEphemeral`, `createPersistentExperience`, `listExperiences`, `captureIdea`, `getLatestSynthesis`, `recordInteraction`. |
| 3 | GPT configuration | Create the Custom GPT on ChatGPT, paste instructions + schema, point at `https://mira.mytsapi.us`. |
| 4 | Verification | GPT calls `getGPTState` successfully. GPT creates an ephemeral experience that renders in the app. |

#### Phase 5B — Experience Quality Testing

Run 3 flows and score each on 5 criteria:

**Flow 1: Planning** — Take a vague idea → see if it becomes a real experience with shape.
- Looking for: compression, clarity, sequence, persistence

**Flow 2: Execution** — Use it to actually do something in the real world.
- Looking for: friction reduction, accountability, next-step quality, movement

**Flow 3: Re-entry** — Leave, do something, come back later.
- Looking for: memory continuity, state reconstruction, intelligent next move, aliveness

**5-point scorecard (per flow):**
1. Was it more useful than plain chat?
2. Did it create a real object or path?
3. Did it make me do something?
4. Did re-entry feel continuous?
5. Did it generate momentum?

#### Failure modes to watch for

| Mode | Description |
|------|-------------|
| Chat with extra steps | Looks structured, but nothing really changed |
| Pretty persistence | Stuff is saved, but not meaningfully used |
| Question treadmill | Keeps asking good questions instead of creating action |
| Flat re-entry | Remembers facts, but not momentum |
| No bite | Helps, but never pushes |

#### Phase 5C — Quality Signal → Next Sprint Decision

Based on testing results:

| Signal | Next Move |
|--------|-----------|
| Structure ✅ State ✅ Behavior ✅ | Move to Sprint 6 (Chaining + Spontaneity) |
| Structure ✅ State ✅ Behavior ❌ | Focus sprint on: stronger escalation logic, better next-action generation, challenge/pressure mechanics, more assertive re-entry |
| Structure ✅ State ❌ | Fix synthesis/re-entry engine before moving forward |
| Structure ❌ | Fix renderer/step quality before anything else |

The coder gets involved when:
- GPT-authored experiences are proven useful
- Coder would create experiences that are genuinely impossible for GPT alone (complex branching, real-time data, multi-media, interactive simulations)
- The coder has enough context to participate (user profile, capability map, experience history)

---

### ✅ Sprint 7 — Genkit Intelligence Layer (Complete)

Replaced naive string summaries with AI-powered intelligence via Genkit + Gemini 2.5 Flash: `synthesizeExperienceFlow`, `extractFacetsFlow`, `suggestNextExperienceFlow`, `compressGPTStateFlow`. Graceful degradation via `runFlowSafe()`. Completion wiring. Migration 005.

---

### ✅ Sprint 8 — Knowledge Tab + MiraK Integration (Complete)

Option B Webhook Handoff architecture. 3-tab study workspace (Learn/Practice/Links), domain-organized grid, home page "Continue Learning" dashboard. Knowledge metadata integrated into Genkit synthesis and suggestion flows. All 6 lanes verified.

---

### ✅ Sprint 9 — Content Density & Agent Thinking Rails (Complete)

Real 3-stage MiraK agent pipeline (strategist + 3 readers + synthesizer + playbook builder). Genkit enrichment flow (refine-knowledge-flow). GPT thinking rails protocol. Multi-unit Knowledge Tab UI. Full pipeline: ~247s, 3-5 units per call.

**Sprint 9 Bug Log (Historical Reference):**
- `audio_script` 400 error: webhook timeout caused Vercel fallback, which lacked the new constant. Root cause was tunnel latency, not webhook logic.
- Content truncation: Fixed by having `webhook_packager` produce metadata only, then programmatically injecting full synthesizer/playbook output into the webhook payload.

---

### ✅ Sprint 10 — Curriculum-Aware Experience Engine (Complete)

> **What shipped:** The full curriculum infrastructure. 7 parallel lanes completed.

| Component | Status |
|---|---|
| Curriculum outlines table + service + types + validator | ✅ Migration 007 applied |
| GPT gateway (5 endpoints: state/plan/create/update/discover) | ✅ All routes live |
| Discover registry (9 capabilities, progressive disclosure) | ✅ Functional |
| Gateway router (discriminated dispatch to services) | ✅ Functional |
| Coach API (chat/grade/mastery routes) | ✅ All 3 routes live |
| Genkit flows (tutorChatFlow + gradeCheckpointFlow) | ✅ Compiled, graceful degradation |
| Step-knowledge-link service (linkStepToKnowledge, getLinksForStep) | ✅ Functional |
| KnowledgeCompanion TutorChat mode | ✅ Dual-mode (read/tutor) |
| GPT instructions rewrite (44 lines, flat payloads) | ✅ |  
| OpenAPI schema consolidation (5 gateway + MiraK) | ✅ |
| Curriculum outline service (CRUD + linking + gap assessment) | ✅ |

**Still unbuilt from Sprint 10 backlog (carries to Sprint 12):**
- `CheckpointStep.tsx` renderer (component NOT created — W1/W2 in Lane 4)
- Checkpoint registration in renderer-registry (no `checkpoint` entry)
- Step API knowledge linking (steps route doesn't handle `knowledge_unit_id` on create/GET)

---

### ✅ Sprint 11 — MiraK Enrichment Loop + Gateway Fixes (Code Complete)

> **What shipped (code complete):** MiraK enrichment webhook mode, flat OpenAPI for GPT Actions, Cloud Run stabilization, readKnowledge endpoint, gateway payload tolerance.

| Component | Status |
|---|---|
| Flat OpenAPI schemas (no nested `payload` objects) | ✅ |
| Gateway payload tolerance (all 3 routes handle flat + nested) | ✅ |
| MiraK `experience_id` in request model + webhook | ✅ |
| Enrichment webhook mode (append steps + link knowledge) | ✅ |
| `readKnowledge` endpoint for GPT | ✅ |
| Discover `dispatch_research` capability | ✅ |
| GPT instructions enrichment workflow (3-step protocol) | ✅ |
| MiraK Cloud Run CPU throttling fix | ✅ |
| MiraK `.dockerignore` + env var mapping | ✅ |

**Operational close (deployment only — no code changes needed):**
- [ ] MiraK Cloud Run redeploy with enrichment code
- [ ] Vercel deploy (git push)
- [ ] GPT Action schema update in ChatGPT settings
- [ ] End-to-end production enrichment verification

---

### 🔲 Sprint 12 — Learning Loop Productization

> **Goal:** Make the already-built curriculum/coach/knowledge infrastructure visible and coherent in the UI. The test: the three emotional moments work — **Opening the app** (user sees their path and what to focus on), **Stuck in a step** (coach surfaces proactively), **Finishing an experience** (user sees synthesis, growth, and what's next).
>
> **Core principle:** The app surfaces stored intelligence; GPT and Coach deepen it. No new backend capability — surface what exists.

#### What Sprint 12 must deliver

| # | Lane | Work |
|---|---|---|
| 1 | **CheckpointStep renderer + registration** | Build `CheckpointStep.tsx` (free text + choice inputs, difficulty badges, submit → grade). Register in renderer-registry. Wire step API to handle `knowledge_unit_id` on step create/GET. This is the missing Sprint 10 Lane 4 work. |
| 2 | **Visible track/outline UI** | Promote curriculum outlines to a first-class UI surface. Home page "Your Path" section: active outlines with subtopics, linked experiences, and `% complete` indicator. Library gets a "Tracks" section. This replaces the generic "Suggested for You." |
| 3 | **Home page context reconstruction** | "Focus Today" section: most recently active experience + next uncompleted step + direct "Resume Step N →" link. "Research Status" badges: pending/in-progress/landed states for MiraK dispatches. "Welcome back" context: time since last visit, new knowledge units since then. |
| 4 | **Completion synthesis surfacing** | Experience completion screen shows synthesis results: 2-3 sentence summary (from `synthesis_snapshots.summary`), key signals, growth indicators (facets created/strengthened), and top 1-2 next suggestions (from `next_candidates`). Replace the static congratulations card. |
| 5 | **Knowledge timing inside steps** | Step renderers use `step_knowledge_links` to show: (1) pre-support card above step content — "Before you start: review [Unit Title]", (2) in-step companion using actual link table (not domain string matching), (3) post-step reveal — "Go deeper: [Unit Title]." |
| 6 | **Coach surfacing triggers + mastery wiring** | Non-intrusive coach triggers: after failed checkpoint ("Need help? →"), after extended dwell without interaction, after opening a step linked to unread knowledge ("Review [Unit] first →"). Wire checkpoint grades into `knowledge_progress` — auto-promote mastery on good scores, keep honest on struggles. |
| 7 | **Integration + Browser QA** | Three-moment verification: (1) Open app → see path + focus + research status, (2) Get stuck on a step → coach surfaces, (3) Complete an experience → see synthesis + growth + next step. Full browser walkthrough. |

#### Default Experience Rhythm (Kolb + Deliberate Practice)

Every serious experience should default to this step shape:
1. **Primer** — short teaching step (lesson, light resolution)
2. **Workbook / Practice** — applied exercise (challenge or questionnaire)
3. **Checkpoint** — test understanding (graded checkpoint step)
4. **Reflection / Synthesis** — consolidate what was done
5. *(optional)* **Deep dive knowledge** — extended reading or linked unit

#### Async Research UX Rule (Mandatory)

Research dispatch must be visible immediately in the UI:
- **Pending**: MiraK dispatch acknowledged, research not started yet
- **In-progress**: Research pipeline running (show on home page)
- **Landed**: Knowledge units arrived, experience enriched (show badge/notification)

The user must never wonder "did my research request go anywhere?" This eliminates "spinner psychology."

#### Sprint 12 Verification

- User opens the app and sees "Your Path" with active curriculum outlines + progress
- Home page shows "Focus Today" with resume link to last active step
- At least one step shows pre-support knowledge card from `step_knowledge_links`
- Checkpoint step renders, grades answers via Genkit, updates `knowledge_progress`
- Coach surfaces after checkpoint failure without user action
- Completion screen shows synthesis summary, growth signals, and next suggestions
- Research dispatch shows visible status on home page
- Navigation re-prioritized for learning-first identity

---

### ✅ Sprint 13 — Goal OS + Skill Map

> **Goal:** Give the user a persistent Goal and a visual Skill Tree that makes their position and trajectory visible. Turn "a pile of experiences in a track" into "a growth system with a destination."
>
> **Prerequisite:** Sprint 12 must prove the productized learning loop works. The skill map is only useful once experiences visibly track progress.

#### Lanes

| # | Lane | Work |
|---|---|---|
| 1 | **Goal entity** | Lightweight `goals` table. Curriculum outlines become children of a goal. |
| 2 | **Skill domains** | `skill_domains` table with mastery scale: `undiscovered → aware → beginner → practicing → proficient → expert`. Progress computed from linked experience completions. |
| 3 | **Goal intake protocol** | GPT deep interview → `createGoal` endpoint → dispatch MiraK for domain research. |
| 4 | **Skill Tree UI** | Visual domain cards with mastery level and progress bar. "What's next" per domain. |
| 5 | **MiraK goal research pass** | Dispatch MiraK with full goal description. Webhook delivers domain-organized knowledge units. |
| 6 | **Integration** | Outlines belong to goals. Experiences belong to outlines. `getGPTState` returns goal + domain mastery. |

#### Explicit Deferrals from Sprint 13

- Gamification animations, XP, streaks, level-up effects
- "Fog of war" / progressive domain discovery UI
- Mentor archetypes / coach stances
- Leaderboards or social features
- Audio/TTS rendering

#### Sprint 11 Verification

- User can create a Goal through GPT intake conversation
- App shows the Skill Tree with all domains at `undiscovered` on creation
- Completing an experience updates domain mastery level
- MiraK research for a goal delivers domain-organized knowledge units
- `getGPTState` includes active goal + domain mastery levels
- GPT uses goal context in re-entry and suggests the highest-leverage next domain

---

### ✅ Sprint 14 — Mastery Visibility & Intelligence Wiring

> **Goal:** Surface the mastery engine and ensure the system reacts intelligently to user progress.

- **Skill Tree Upgrades:** Mastery badges, progress bars, and linked experience/knowledge statistics.
- **Coach Triggers:** Contextual AI surfacing when a user fails a checkpoint or dwells too long.
- **Completion Retrospective:** Goal trajectory updates, "What Moved" mastery changes, and domain-linked path suggestions.
- **Intelligent Focus:** Home priority heuristic based on leverage rather than strict recency.
- **Schema Truth Pass:** Aligned validators, discovery registries, and step payload definitions.

---

### ✅ Sprint 15 — Chained Experiences + Spontaneity

> **Goal:** Make the app feel alive. Experiences chain, loop, interrupt, and progress the user forward.

- **Experience Chaining UI:** Workspace banners for context, "Start Next" post-completion, and dynamic graph wiring.
- **Ephemeral Injection System:** Real-time urgency toasts forcing low-friction micro-challenges or checks to break linear rigidity. 
- **Re-Entry Engine Hardening:** Support for interval/manual triggers and high-priority surfacing of "unfinished business" on the home page.
- **Friction + Weekly Loops:** Automated multi-pass iteration (creating a `loop_record`) when user encounters high friction.
- **Timeline Evolution:** Event categorization (system, user, knowledge, ephemeral) for full observability. 
- **Profile Redesign:** Facet cards displaying confidence/evidence linked directly to synthesis snapshots, acting as a clear system-state dashboard.

---

### 🔲 Sprint 16 — Proposal → Realization → Coder Pipeline (Deferred)

> **Goal:** When results from Sprint 5 testing show that GPT-only experiences are too limited, bring the coder into the loop. Generated experiences go through a reviewable pipeline. Ephemeral experiences bypass entirely.
>
> **Prerequisite:** Sprint 5 testing proves the experience loop works but identifies specific gaps that only a coder can fill.
>
> **Key insight:** The GPT doesn't just "assign" work to the coder — it writes a living spec that IS the coder's instructions. The spec lives as a GitHub Issue. The frontend can also edit it. This makes the issue a contract between GPT, user, and coder.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Proposal endpoint | `app/api/experiences/propose/route.ts` — GPT calls this with `{ experienceType, goal, resolution, reentry, sections, taskCount, whyNow }`. Creates a proposed experience instance (persistent). |
| 2 | Realization record | When coder picks up a proposal, a `realization` record is created linking `experience_instance_id` to GitHub PR (if applicable). |
| 3 | **Coder instruction issue** | GPT creates a GitHub Issue that serves as the coder's custom instructions. The issue body contains: experience schema, step payloads, resolution constraints, rendering requirements, and acceptance criteria. This is the coder's "prompt" — structured, not free-form. |
| 4 | **Issue-as-living-spec** | The frontend surfaces the instruction issue in the review UI. The user can edit it before the coder starts (add constraints, change resolution, tweak step content). GPT can also update it mid-flight if the user refines their request. The issue is a 3-way contract: GPT writes it, user refines it, coder executes it. |
| 5 | **Coder schema contract** | Define a structured schema for the issue body — not free-text markdown. Something parseable: YAML front-matter or a JSON code block that the coder agent can read programmatically. This is effectively a "coder OpenAPI" — the coder knows exactly what fields to read, what to build, and what to validate against. |
| 6 | Review UI evolution | Refactor `/review/[id]` to support both legacy PR reviews and new experience reviews. User-facing buttons: Preview Experience · Approve · Request Changes · Publish. |
| 7 | Publish flow | "Publish" = merge PR (if GitHub-backed) + set experience status to `published` + activate in workspace + fire re-entry contract registration. |
| 8 | Supersede/versioning | When a new version of an experience is published, old version moves to `superseded`. User sees latest in library. |
| 9 | Realization status tracking | `realization_reviews` table tracks: `drafted → ready_for_review → approved → published`. Maps to PR states internally. |
| 10 | Arena evolution | `/arena` shows both active realizations and active experiences. Two panes or unified view. |
| 11 | Coder context generation | Give the coder enough context to participate: user profile, capability map, experience history. See Sprint 9. |

#### Coder Instruction Flow (New Architecture)

```
GPT conversation
  ↓ "User wants a complex interactive experience"
  ↓
GPT calls propose endpoint
  ↓ Creates experience_instance (status: proposed)
  ↓ Creates GitHub Issue with structured spec
  ↓
┌──────────────────────────────────────────────────────┐
│  GitHub Issue = Coder Instructions                    │
│                                                       │
│  --- coder-spec ---                                   │
│  experience_type: challenge                           │
│  template_id: b0000000-...                            │
│  resolution:                                          │
│    depth: heavy                                       │
│    mode: build                                        │
│    timeScope: multi_day                               │
│    intensity: high                                    │
│  steps:                                               │
│    - type: lesson                                     │
│      title: "Understanding the domain"                │
│      rendering: "needs custom visualization"          │
│    - type: challenge                                  │
│      title: "Build a prototype"                       │
│      rendering: "needs code editor widget"            │
│  acceptance_criteria:                                 │
│    - All steps render without fallback                │
│    - Custom visualizations load real data             │
│    - Interaction events fire correctly                │
│  --- end spec ---                                     │
│                                                       │
│  Context: [link to user profile]                      │
│  Capability map: [link to renderer registry]          │
│  Related experiences: [links]                         │
└──────────────────────────────────────────────────────┘
  ↓                          ↑
  ↓ Coder reads spec         ↑ User edits via frontend
  ↓ Builds experience        ↑ GPT updates if user refines
  ↓ Opens PR                 ↑
  ↓                          ↑
  ↓ PR links back to issue   ↑
  ↓ Review in app UI         ↑
  ↓ Approve → Publish        ↑
  ↓                          ↑
  → Experience goes live ←───┘
```

#### Issue as state and memory (not just instructions)

> **Note:** We don't know the best shape for this yet. The core idea is that the GitHub Issue isn't just a one-shot spec — it's the coder's **working memory** during execution. The issue body starts as instructions, but the coder can update it as it works:
>
> - Append a "progress" section as steps are built
> - Log which renderers it created, which step payloads it validated
> - Flag blockers or questions for the user/GPT to answer
> - Mark acceptance criteria as met/unmet
>
> This turns the issue into a **live contract** — the coder writes to it, the GPT reads from it, the user can see what's happening in real-time.
>
> We may also be able to **trigger GitHub Actions workflows** or **dispatch events** to the coder when the user approves/modifies/requests changes. The webhook pipeline from Sprint 2 already supports `dispatch-workflow` — the question is how to wire it so the coder gets kicked off automatically when a spec is ready.
>
> The best implementation pattern is TBD. Could be: issue comments for progress, issue body for state, labels for status. Could be something else entirely. This will become clearer once Sprint 5 testing is done and we know what the coder actually needs to do.

#### DB-aware coder workflows

> **Key idea:** The coder doesn't have to work blind. Supabase secrets (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are already stored in GitHub Actions environment secrets. This means a GitHub Actions workflow can query the live database during execution.
>
> This opens up a powerful pattern: **"based on what's in the database, do this."**
>
> Examples:
> - Coder reads the user's existing experiences from Supabase to understand what renderers and step types have already been used → avoids duplicating work, builds on existing patterns
> - Coder reads the spec issue + checks the `experience_templates` table to validate that the requested step types actually exist, and falls back or creates new ones if needed
> - Coder reads `interaction_events` to understand how users have engaged with similar experiences → tailors the new experience based on real usage data
> - Coder reads `synthesis_snapshots` to understand the user's current goals/direction → makes the experience feel personally relevant
> - On completion, coder writes the new experience instance + steps directly to Supabase (not just a PR with code) → the experience goes live without a deploy
>
> This makes the coder a **living participant** in the system, not just a code generator. It can read the DB, understand context, build something appropriate, and write results back — all within a single GitHub Actions run.
>
> **Infrastructure already in place:**
> - ✅ Supabase secrets in GitHub Actions env
> - ✅ `dispatch-workflow` endpoint exists (`/api/github/dispatch-workflow`)
> - ✅ Webhook handlers for `workflow_run` events exist (`lib/github/handlers/handle-workflow-run-event.ts`)
> - 🔲 Workflow YAML that actually uses the secrets to query Supabase
> - 🔲 Coder agent that knows how to read/write experience data

#### Why issue-as-instructions matters

1. **The coder never guesses.** Every experience spec is an explicit, parseable contract.
2. **The user has agency.** They can see and edit the spec before the coder starts.
3. **The GPT can iterate.** If the user says "actually make it harder," GPT updates the issue body.
4. **Traceability.** The issue history shows every change to the spec — who changed what and when.
5. **The coder can have its own "schema."** Just like the GPT has an OpenAPI schema for API calls, the coder can have a structured spec schema for what it reads from issues. Both are typed contracts.
6. **The issue is working memory.** The coder can write progress back to it. The GPT and user can read it. The issue becomes the shared context for the entire realization.

#### Sprint 16 Verification
- GPT can POST a proposal that creates both an experience instance AND a GitHub Issue with structured spec
- User can view and edit the coder spec from the frontend review UI
- GPT can update the issue body via API when the user refines their request
- Coder agent can parse the structured spec from the issue body
- Proposal can be approved and published via the UI
- Published experience appears in library and workspace with active re-entry contract
- Legacy PR merge flow still works
- Ephemeral experiences are confirmed to NOT appear in review queue

### 🔲 Sprint 17 — GitHub Hardening + GitHub App

> **Goal:** Make the realization side production-serious. Migrate from PAT to GitHub App for proper auth.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Typed realization workflows | GitHub Actions for: validate experience schema, deploy preview, sync realization status. |
| 2 | Schema checks | CI check that validates `config_schema` against step renderer contract. |
| 3 | PR comment summaries | Auto-comment on PRs with experience summary + resolution profile + preview link. |
| 4 | Selective issue creation | Issues only for large realizations. Small experiences skip issues entirely. Ephemeral never touches GitHub. |
| 5 | **GitHub App implementation** | Replace PAT with a proper GitHub App. Per-installation trust model. This is required for production — PAT auth doesn't scale and is a security liability. The App gets its own permissions scope (issues, PRs, webhooks, Actions dispatch) and can be installed on specific repos. `lib/github/client.ts` is already designed as the auth boundary — only that file changes. |
| 6 | **Webhook migration** | Currently using Cloudflare tunnel + raw HMAC webhook. In production, the webhook receiver needs to handle GitHub App webhook format. The signature verification in `lib/github/signature.ts` may need updates for App-style payloads. |

---

### 🔲 Sprint 17 — Personalization + Coder Knowledge

> **Goal:** Vectorize the user through action history and give the coder compiled intelligence.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Compressed snapshots | Automated synthesis snapshot generation after each experience completion. |
| 2 | Facet extraction | Extract `profile_facets` from interaction patterns (interests, skills, effort areas, preferred resolution profiles). |
| 3 | Preference drift tracking | Compare facets over time to detect shifting interests/goals. |
| 4 | Experience recommendation layer | Rule-based recommendation: given current facets + completion history + friction signals, suggest next experiences. |
| 5 | GPT context budget | Compress synthesis packets to fit within GPT context limits while preserving maximum signal. |
| 6 | Coder-context generation | `lib/services/coder-context-service.ts` — generates `docs/coder-context/*.md` from DB state. Only now, when there's real data to compile from. |
| 7 | Capability map | `docs/coder-context/capability-map.md` — what renderers exist, what step types are supported, what endpoints are available. |

---

### 🔲 Sprint 18 — Production Deployment

> **Goal:** Deploy Mira Studio to Vercel for real use. Replace the local dev tunnel with production infrastructure. This is where the webhook, auth, and edge function questions get answered.
>
> **Reality check:** Right now everything runs on `localhost:3000` with a Cloudflare tunnel (`mira.mytsapi.us`). That works for dev and GPT testing, but for real use we need:
> - The app hosted somewhere permanent (Vercel)
> - Webhooks that don't depend on a local machine being on
> - Auth that isn't a hardcoded user ID
> - The GPT pointing at a real URL, not a tunnel

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | **Vercel deployment** | Deploy Next.js app to Vercel. Environment variables for Supabase, GitHub token/app credentials. Vercel project setup, domain config. |
| 2 | **GPT server URL update** | Update the OpenAPI schema `servers` URL from `https://mira.mytsapi.us` to the production Vercel URL. Re-configure the Custom GPT. |
| 3 | **Webhook endpoint hardening** | `/api/webhook/github` currently expects to receive events via tunnel. In production it receives events directly from GitHub. May need to update signature verification, handle GitHub App webhook format. The existing `app/api/webhook/vercel/route.ts` stub needs to be implemented if Vercel deploy hooks are needed. |
| 4 | **Edge function evaluation** | Determine if any API routes need to run as Vercel Edge Functions or Supabase Edge Functions. Candidates: `/api/gpt/state` (latency-sensitive, called at every GPT conversation start), `/api/experiences/inject` (needs to be fast for ephemeral experiences), `/api/interactions` (high-volume telemetry). Trade-off: edge functions have limitations (no Node.js APIs, different runtime) vs. serverless functions (slower cold starts). |
| 5 | **Supabase Edge Functions** | If the coder pipeline needs server-side orchestration that can't run in Vercel serverless (long-running, needs to call GitHub API + Supabase in sequence), a Supabase Edge Function may be the right place. Use case: "on experience approval, dispatch coder workflow, create realization record, update issue status" — that's a multi-step side effect that shouldn't block the UI. |
| 6 | **Auth system** | Replace `DEFAULT_USER_ID` with real auth. Options: Supabase Auth (email/magic link), or just a simple API key for the GPT. The GPT needs to authenticate somehow — either a shared secret header or OAuth. |
| 7 | **Environment parity** | Ensure local dev still works after production deploy. The Cloudflare tunnel setup should remain for local GPT testing. `.env.local` vs `.env.production` split. |
| 8 | **GitHub App webhook registration** | If Sprint 8 migrated to a GitHub App, the App's webhook URL needs to point at the Vercel production URL, not the tunnel. This is a one-time config change in the GitHub App settings. |

#### Key decisions to make before Sprint 18

| Question | Options | Impact |
|----------|---------|--------|
| Edge functions: Vercel or Supabase? | Vercel Edge (fast, limited runtime) vs Supabase Edge (Deno, can be longer-running) vs plain serverless (slower, full Node.js) | Affects which routes can run where |
| GPT auth in production? | Shared secret header, OAuth, or Supabase Auth token | Affects OpenAPI schema `security` section |
| Can the coder run as a GitHub Action triggered by webhook? | Yes (dispatch workflow on approval) vs external agent polling issues | Affects architecture |
| Custom domain? | `mira.mytsapi.us` via Vercel, or new domain | Affects GPT config + webhook registration |

#### Sprint 18 Verification
- App is live on Vercel at a permanent URL
- GPT Actions point at production URL and all endpoints work
- GitHub webhooks deliver to production without tunnel dependency
- Local dev mode still works with tunnel for testing
- No hardcoded `DEFAULT_USER_ID` in production paths

## Refactoring Rules

These rules govern how we evolve the existing codebase without breaking it.

1. **Additive, not destructive.** New entities and routes are added alongside existing ones. Nothing gets deleted until it's fully replaced.
2. **Storage adapter pattern.** `lib/storage.ts` gets an adapter interface. JSON file adapter stays as fallback. Supabase adapter becomes primary.
3. **Service layer stays.** All 11 existing services keep working. New services are added for experience, interaction, synthesis.
4. **State machine extends.** `lib/state-machine.ts` gains `EXPERIENCE_TRANSITIONS` alongside existing `IDEA_TRANSITIONS`, `PROJECT_TRANSITIONS`, `PR_TRANSITIONS`.
5. **Types extend.** New files in `types/` for experiences, interactions, synthesis. Existing types gain optional new fields (e.g., `Project.experienceInstanceId`).
6. **Routes extend.** New routes under `app/api/experiences/`, `app/api/interactions/`, `app/api/synthesis/`. Existing routes untouched.
7. **Copy evolves.** `studio-copy.ts` gains experience-language sections. Existing copy preserved.
8. **GitHub stays as realization substrate.** No runtime data goes to GitHub. DB is the runtime memory.
9. **GPT contract expands.** New endpoints for proposals, ephemeral injection, and state fetch. Existing `idea_captured` webhook preserved.
10. **No model logic in frontend.** Components render from typed schemas. The backend decides what to show.
11. **Resolution is explicit, not inferred.** Every experience carries a resolution object that governs depth, mode, time scope, and intensity. No guessing.

---

## Anti-Patterns to Avoid

| ❌ Don't | ✅ Do Instead |
|----------|--------------|
| Make GitHub the app database | Use Supabase for runtime, GitHub for realizations |
| Expose "Merge PR" as user-facing language | Use "Approve Experience" / "Publish" |
| Hand-maintain `.md` files as source of truth | Generate coder-context docs from DB (Sprint 8+) |
| Build infinite experience types at once | Ship 6 Tier 1 classes, then iterate |
| Put model logic in React components | Compute in services, render from schema |
| Replace the whole app | Extend the current structure additively |
| Force every experience through GitHub Issues | Issues only for large realizations needing decomposition |
| Make everything pipeline-like | Add ephemeral experiences for spontaneity |
| Let the coder guess resolution | Make resolution an explicit typed object on every instance |
| Interpret friction in-app | Compute friction during synthesis, let GPT interpret |
| Over-invest in coder-context early | Prioritize experience system → renderer → DB → re-entry first |
| Call internal objects "builds" | Use "realizations" — we're realizing experiences, not building features |

---

## Sprint 5B — Experience Robustness (Field Test Findings)

> **Source:** Live user testing of the "AI Operator Brand" persistent experience — 18 steps, `heavy/build/multi_day/high` resolution. This is the first real field test of a GPT-authored multi-day experience and it exposed hard failures in every renderer.

### What Happened

The GPT created an ambitious, well-structured 18-step experience (questionnaire → reflection → lessons → plan builders → challenges → essay). The *content design* is strong — the steps build on each other, the progression makes sense, and the scope is appropriate for a multi-day build-mode experience.

But the *renderer infrastructure* broke down at every interaction point. The user hit wall after wall:

### 5 Hard Failures

| # | Failure | Where | Root Cause |
|---|---------|-------|------------|
| 1 | **Lesson checkpoints have no input field** | Steps 2, 6 ("Write 3 sentences…", "Describe in one paragraph…") | `LessonStep` renders `checkpoint` sections as a single "I Understand" button. The GPT wrote a checkpoint that asks the user to *write* something, but the renderer only supports *acknowledging*. There is no text area, no space to put the sentences. The user sees a writing prompt with nowhere to write. |
| 2 | **EssayTasks step has no essay writing area** | Step 17 ("Write the brand manifesto in one page") | `EssayTasksStep` renders `tasks` as boolean checkboxes and the `content` field as a collapsible read-only block. There is no text area to actually *write* the manifesto. The tasks just toggle true/false. The whole point of the step — deep writing — is impossible. |
| 3 | **Plan Builder items are trivial checkboxes** | Steps 3, 8, 11, 16 | `PlanBuilderStep` renders each item as a checkbox with hover-to-reorder. Items like "Define funnel stages" and "Define pricing and packaging" are serious multi-hour activities that deserve their own workspace — not a checkbox you click to acknowledge. You can't expand, add notes, or come back. |
| 4 | **Challenge "Market Scan" is impossibly scoped for a single page** | Step 4 ("Study 30 real small businesses") | `ChallengeStep` gives each objective a 2-row textarea labeled "Record your progress or results…". Studying 30 businesses and capturing patterns is a multi-session research activity. It needs its own workspace, a structured capture surface, and the ability to come back over days. Instead it's a single screen you pass through. |
| 5 | **The entire experience is a forced linear slide deck** | All 18 steps | `ExperienceRenderer` tracks `currentStepIndex` and only moves forward. No step navigation, no ability to go back, no way to see what's ahead. An 18-step multi-day experience renders as page 1 → page 2 → … → page 18. You can't revisit a reflection you wrote last week. You can't check your plan while doing a challenge. The system loses all the user's context because it behaves like a wizard, not a workspace. |

### What This Means for the Architecture

These aren't renderer polish issues — they reveal a fundamental mismatch between what the GPT can *author* and what the renderers can *support*. The GPT authored a legitimate multi-week learning and building curriculum. The renderers treated it like a form wizard.

The core insight: **experiences aren't linear slides. They're workspaces you inhabit over time.** The current architecture forces every experience through a single narrow pipe (`currentStepIndex++`). Multi-day, heavy, high-intensity experiences need a fundamentally different interaction model.

### 10 Robustness Upgrades

These are ordered by impact on the user experience and structured to reference existing roadmap items and coach.md flows where applicable.

---

#### R1: Non-Linear Step Navigation (Experience as Workspace)

**Problem:** The renderer is a forward-only wizard. Multi-day experiences need free navigation.

**Solution:** Replace the linear `currentStepIndex` model with a step-map navigator. The user should see a persistent side-nav or top-nav showing all steps with completion status. They can jump to any step, revisit completed steps (read-only or re-editable based on type), and see what's ahead.

**Key design rules:**
- Steps can have `blocked` / `available` / `active` / `completed` states.
- Some steps can be gated (e.g., "complete questionnaire before challenge"), but most should be freely navigable.
- The experience becomes a *place you go into*, not a tunnel you pass through.
- Resolution still controls chrome: `light` = minimal nav, `heavy` = full node map.

**Connects to:** Roadmap Sprint 8 "Experience graph wiring" (internal chaining). R1 is the *intra-experience* version of that problem.

---

#### R2: Checkpoint Sections Must Support Text Input

**Problem:** `LessonStep` checkpoints render as "I Understand" buttons even when the content asks the user to write something.

**Solution:** Add a `checkpoint` sub-type or detect prompts that ask for writing. When a checkpoint body contains a writing prompt (or is explicitly tagged), render a textarea + submit instead of a confirmation button. Capture the response as an interaction event.

**Two modes:**
- `confirm` checkpoint → "I Understand" button (current behavior, appropriate for knowledge checks)
- `respond` checkpoint → textarea + word count + submit (for "Write 3 sentences explaining…")

This is a renderer change — the `checkpoint` section type in the lesson payload gets an optional `mode: 'confirm' | 'respond'` field. The GPT can also be instructed to use the right mode.

---

#### R3: EssayTasks Must Have a Writing Surface

**Problem:** The essay step has no writing area. Tasks are boolean checkboxes for work that requires deep composition.

**Solution:** `EssayTasksStep` needs two surfaces:
1. **Reading pane** — the `content` field (the brief/instructions), always visible (not collapsed).
2. **Writing pane** — a rich textarea per task where the user actually *writes*. Each task becomes a titled section with a textarea, word count, and auto-save.

The task checkboxes can remain as a secondary signal, but the primary interaction is *writing*, not *checking*.

**Connects to:** coach.md flow #2 (In-App Coaching Chat). A coaching co-pilot embedded alongside the writing pane would make this dramatically more useful — "Am I on the right track with this manifesto section?"

---

#### R4: Challenge Steps Need Expandable Workspaces

**Problem:** Complex challenges like "Study 30 businesses" render as a flat list with tiny textareas.

**Solution:** Each challenge objective should expand into its own mini-workspace when clicked. The collapsed view shows the objective + completion status. The expanded view shows:
- The full description + proof requirements
- A resizable textarea (or eventually a structured form)
- Draft save indicator
- Ability to attach notes, links, or artifacts

For research-intensive objectives, a further evolution: embed structured capture (rows of data, tags, notes per entry). This is where Genkit flows from coach.md become natural — an AI that helps you *do the research*, not just track whether you did it.

**Connects to:** coach.md flow #3 (Experience Content Generation). The challenge workspace can include AI-assisted research helpers, content scaffolding, or example analysis powered by Genkit — making the challenge step a *tool for doing the work*, not just a checklist of whether you did it.

---

#### R5: Plan Builder Items Must Support Notes and Detail

**Problem:** Plan items like "Define funnel stages" are checkbox-only. No space to add work.

**Solution:** Plan Builder items become expandable cards. Click to expand → shows a notes area, sub-items, and links. The checkbox acknowledges the item; the expanded card is where the real work happens.

**Future state:** Plan items can become their own mini-experiences. "Define funnel stages" could open a sub-experience with its own steps. This is the "fractalization" concept — experiences contain experiences.

**Connects to:** Roadmap Sprint 8 "Experience graph wiring" + "Progression rules" — the plan builder becomes a graph node, not a flat list.

---

#### R6: Multi-Pass GPT Enrichment (Iterative Experience Construction)

**Problem:** The GPT creates the entire experience in one shot. An 18-step curriculum is too much to get right on the first pass — the GPT can't know what depth each section needs until the user starts working.

**Solution:** Allow the GPT to make 3-4 passes over an experience:

**Pass 1 — Outline:** GPT creates the experience with structural steps (titles, types, high-level goals). Payloads are intentionally sparse — "skeleton" content.

**Pass 2 — Enrichment:** After the user starts (or based on questionnaire answers), the GPT re-enters and fills out the step payloads with personalized, detailed content. This uses the re-entry contract + the `suggestNextExperienceFlow` from coach.md.

**Pass 3 — Adaptation:** After the user completes early steps (or expresses friction), the GPT updates remaining steps. Lessons become more specific. Challenges scale to the user's demonstrated level. New steps can be inserted.

**Pass 4+ — Deepening:** Completed steps can be "deepened" — the GPT adds follow-up content, harder challenges, or new sections to a lesson the user engaged with deeply.

**Technical requirements:**
- An API endpoint to update individual `experience_steps` payloads on an existing instance
- Step insertion (add new steps between existing ones)
- Step removal or soft-disable (if later context makes a step irrelevant)
- Re-entry contract triggers at specific step completions, not just experience completion

**Connects to:** coach.md flow #3 (Experience Content Generation), #7 (Experience Quality Scoring), #8 (Intelligent Re-Entry Prompts). This is the mechanism that makes multi-day experiences *alive* rather than *stale*.

---

#### R7: Research/Skill-Based Step Type (Rich Activity Page)

**Problem:** "Study 30 businesses" is crammed into a ChallengeStep — but it's fundamentally a different kind of activity. It's not a task to complete; it's a *skill to develop* through repeated practice sessions.

**Solution:** A new step type (Tier 2): `research` or `skill_lab`. This renders as its own workspace page with:
- A structured entry pad (rows/cards for each research subject)
- AI-assisted research tools (Genkit flow that can scan a URL, summarize a business, extract patterns)
- Pattern aggregation (the system shows emerging themes across your entries)
- Multi-session support (you come back and add more entries over days)
- Progress visualization (30 entries goal → currently at 12)

This is the first step type that truly benefits from Genkit intelligence — the AI doesn't just passively record, it actively participates in the research.

**Connects to:** coach.md flow #3 (Content Generation) + #5 (Profile Facet Extraction). The research data the user generates becomes input for facet extraction and next-experience suggestion.

**Architectural note:** This step type may need its own page route (`/workspace/[instanceId]/research/[stepId]`) rather than rendering inline, because it's too rich for the current single-pane layout.

---

#### R8: Step-Level Re-Entry Instead of Experience-Level Only

**Problem:** Re-entry contracts currently fire at experience completion. But multi-day experiences need re-entry *during* the experience — at specific step boundaries.

**Solution:** Allow `reentry` hooks on individual steps, not just on the experience instance:
- After completing the questionnaire → GPT enriches upcoming steps based on answers
- After the market scan → GPT generates a synthesis of patterns found
- After writing a draft → GPT provides feedback on the writing

This turns the linear experience into a *conversation with the system*. The user does work, the system responds with intelligence, the user continues with more context.

**Connects to:** coach.md flow #2 (In-App Coaching Chat), #6 (Friction Analysis), #8 (Intelligent Re-Entry Prompts). Step-level re-entry is what makes the "coach" concept real — not a separate chat panel, but the system naturally responding to your progress at natural breakpoints.

---

#### R9: Experience Overview / Progress Dashboard

**Problem:** With 18 steps, the user has no map. They don't know where they are, what's ahead, or what they've accomplished.

**Solution:** An experience overview page that shows:
- All steps in a visual layout (node map, timeline, or structured list)
- Completion status per step (with time spent, drafts saved, word counts)
- Blocked/available gates
- Quick-jump navigation
- A summary of submitted work (your questionnaire answers, your reflections, your challenge results)
- Re-entry suggestions ("Mira thinks you should focus on Step 9 next")

This overview is the "home" of the experience. You land here, orient yourself, then dive into a specific step. It replaces the current "start at page 1 and click forward" model.

**Connects to:** Roadmap "Frontend Surface Map" — this is the evolution of `/workspace/[instanceId]` from a single-pane renderer into a proper workspace.

---

#### R10: Draft Persistence and Work Recoverability

**Problem:** The telemetry system captures `draft_saved` events with content, but these are fire-and-forget interaction events — they don't hydrate back into the renderer on return. If you reload the page or come back tomorrow, all your in-progress text is gone.

**Solution:**
- Step renderers should persist work-in-progress to a durable store (Supabase `artifacts` table or a `step_drafts` column on `experience_steps`)
- When the user revisits a step, their previous drafts are hydrated back
- Challenge textareas, reflection responses, essay writing — all auto-saved and recoverable
- Visual indicator showing "Last saved 3m ago" or "Draft from March 25"

**This is critical for multi-day experiences.** Without it, the system tells you to "study 30 businesses" but forgets everything you wrote if you close the tab.

**Connects to:** The `artifacts` table already exists in the schema. The `useInteractionCapture` hook already fires `draft_saved` events. The missing link is *reading them back* and hydrating the renderer state from saved drafts.

---

### Priority Ordering

| Priority | Upgrade | Why First | Sprint |
|----------|---------|-----------|--------|
| 🔴 P0 | R1 (Non-linear navigation) | Without this, multi-day experiences are unusable. Everything depends on being able to navigate freely. | 5B |
| 🔴 P0 | R10 (Draft persistence) | Without this, any multi-session work is lost. The system is lying about being "multi-day" if it can't remember your work. | 5B |
| 🔴 P0 | R2 (Checkpoint text input) | Easy fix, huge impact. Lessons become interactive instead of passive. | 5B |
| 🔴 P0 | R3 (Essay writing surface) | The essay step is broken — its core function (writing) is impossible. | 5B |
| 🟠 P1 | R4 (Expandable challenge workspaces) | Makes challenges feel like real work surfaces, not flat lists. | 5B/6 |
| 🟠 P1 | R5 (Plan notes/expansion) | Makes plan builders useful, not trivial. | 5B/6 |
| 🟠 P1 | R9 (Experience overview dashboard) | The map that makes navigation meaningful. Can be built alongside R1. | 5B/6 |
| 🟡 P2 | R6 (Multi-pass GPT enrichment) | Requires API changes + GPT instruction updates. Higher complexity, massive payoff. | 6 |
| 🟡 P2 | R8 (Step-level re-entry) | Natural extension of the re-entry engine. Requires Genkit flows to be useful. | 6/7 |
| 🟢 P3 | R7 (Research/skill-lab step type) | New step type, highest complexity. Benefits from R4 + R6 being done first. | 7+ |

### How This Changed the Sprint Plan

Sprint 5B became a **renderer hardening sprint** before moving to Genkit (now Sprint 7). Without R1, R2, R3, and R10, the Genkit flows would have been adding intelligence to a system that couldn't even let users *work* inside their experiences. The renderers became workspaces first, then AI can make those workspaces intelligent.

The executed sequence:
1. **Sprint 5B** ✅ — Contracts + graph + timeline + profile + validators + progression (groundwork)
2. **Sprint 6** ✅ — R1 + R2 + R3 + R4 + R5 + R6 + R9 + R10 (full workspace model, navigation, drafts, multi-pass API)
3. **Sprint 7** 🔲 — Genkit flows (synthesis, facets, suggestions) — the workspaces are now ready for intelligence
4. **Sprint 8+** 🔲 — R7 (research step type) + R8 (step-level re-entry) + coder pipeline

### Lesson for the GPT

The GPT authored a genuinely excellent curriculum. The *content design* beat the *infrastructure*. This is a positive signal — the GPT understands depth, sequencing, and skill-building better than the app could initially render.

**Current GPT capabilities (post-Sprint 6):**
- ✅ Create 18+ step experiences — workspace navigator handles any number of steps
- ✅ Use `checkpoint` type with writing prompts — textareas render for `respond` mode
- ✅ Use `essay_tasks` for long-form writing — per-task textareas with word counts
- ✅ Use multi-pass enrichment — update/add/remove/reorder steps after initial creation
- ✅ Drafts persist — users can close the browser and return tomorrow
- ✅ Schedule steps — set `scheduled_date`, `due_date`, `estimated_minutes` for pacing

---

- [ ] Which Supabase org / project to use? (Edgefire, Threadslayer, or Workmanwise — or create new?)
- [ ] Auth strategy: Supabase Auth (email/magic link) or stay single-user with service role key?
- [ ] Should the JSON fallback persist permanently for offline dev, or sunset after DB migration?
- [ ] How does the DSL for experience specs evolve — YAML in issue body, or structured JSON via API?
- [ ] Should the coder spec schema live in the issue body (YAML front-matter), a separate `.coder-spec.yml` file in the PR, or a dedicated Supabase table? Trade-off: issue body is visible + editable by all 3 parties (GPT, user, coder), but file-in-repo is version-controlled.
- [ ] Should the frontend have a spec editor UI, or is editing the issue body directly sufficient?
- [ ] What's the right compression strategy for GPT re-entry packets? (token budget vs. signal)
- [ ] Should Tier 1 experience templates be hardcoded or editable via admin UI?
- [ ] Should ephemeral experiences have a separate library section ("Moments") or inline with persistent?
- [ ] How does the coder agent get triggered? GitHub Actions workflow dispatch on approval, or external agent polling for issues with a specific label? Or GitHub Copilot coding agent assignment?
- [ ] Should the issue serve as working memory (coder writes progress back to issue body/comments) or should state live in Supabase with the issue as a read-only spec?
- [ ] Vercel Edge Functions vs Supabase Edge Functions vs plain serverless — which routes need edge performance?
- [ ] What auth does the GPT use in production? Shared secret, OAuth, or Supabase Auth token in the header?
- [ ] If the coder can write directly to Supabase, does the experience even need a PR/deploy? Or can the coder create experience_instances + steps directly in the DB and they go live immediately? (Code changes still need PRs, but pure data experiences might not.)

---

## Principles

1. **Experience is the central noun.** Not PR, not Issue, not Project.
2. **DB for runtime, GitHub for realization.** Two parallel truths, never confused.
3. **Approve Experience, not Merge PR.** User-facing language is always non-technical.
4. **Resolution is explicit.** Every experience carries a typed resolution object. No guessing, no drifting.
5. **Spontaneity lives next to structure.** Ephemeral experiences make the system feel alive. Persistent experiences make it feel intentional.
6. **Every experience creates its own continuation.** Re-entry contracts ensure GPT re-enters with targeted awareness, not generic memory.
7. **Additive evolution, not rewrites.** Extend what works. Replace nothing until it's fully superseded.
8. **The app stays dumb and clean.** Intelligence lives in GPT and the coder. The app renders and records.
9. **Friction is observed, not acted on.** The app computes friction. GPT interprets it. The app never reacts to its own friction signal.
10. **Sometimes explain. Sometimes immerse.** The resolution object decides. The system never defaults to one mode.

---

## UX Blind Spots & Suggestions (March 2026 Audit)

> Based on a full read of the roadmap + the actual codebase. These are the things that will feel weird, broken, or hollow to a user who is trying to use Mira as a mastery platform — even if the backend is technically capable.

### 1. The "Why Am I Here" Problem — No Visible Goal Spine

**What's happening:** The user sees experiences, knowledge units, and profile facets — but nothing that ties them into a story. There's no visible thread from "I want to become X" → "these are the skill domains" → "these experiences build those skills" → "here's your progress." Curriculum outlines exist in the backend (service, table, GPT state endpoint), but **users literally cannot see them**. The app feels like a collection of things to do rather than a system pulling you toward something.

**Why it matters:** This is the single biggest gap between what the system *knows* and what the user *feels*. The GPT understands the user's trajectory. The backend tracks curriculum outlines. But the app itself can't tell the user their own story.

**Suggestion:** Sprint 10 Lane 1 (visible track/outline UI) is the right fix. But it needs to be more than a list — it needs to be the **first thing the user sees** on the home page. Replace or supplement the current "Suggested Experiences" section with a "Your Path" section: the active curriculum outline(s) with subtopics, linked experiences, and a real progress bar. The user should open the app and immediately see: "You're 35% through AI Operator Brand. Next up: Marketing Fundamentals."

---

### 2. Knowledge Is a Library, Not a Living Part of the Loop

**What's happening:** Knowledge lives in `/knowledge`. Experiences live in `/workspace`. The two feel like separate apps. Step-knowledge links exist in the database (`step_knowledge_links` table) but are **not rendered in the step UI**. The `KnowledgeCompanion` at the bottom of steps fetches by `knowledge_domain` string match — it doesn't use the actual link table. A user completes a lesson step and doesn't see "this connects to Knowledge Unit X that you studied yesterday." They study a knowledge unit and don't see "this is relevant to Step 4 of your active experience."

**Why it matters:** The whole thesis is that knowledge from external research (MiraK) becomes fuel for experiences and mastery. Right now they're two parallel tracks that don't visibly cross-pollinate. The user has to manually notice the connection.

**Suggestion:** Sprint 10 Lane 3 (knowledge timing as product contract) is the right fix. But push further: when a user opens a step that has `step_knowledge_links`, show a small "Primer" card **above** the step content — "Before you start: review [Unit Title]" with a direct link. After step completion, show "Go deeper: [Unit Title]" as a post-step reveal. Make the link table the driver, not domain string matching.

---

### 3. Mastery Feels Self-Reported, Not Earned

**What's happening:** The knowledge mastery progression (unseen → read → practiced → confident) is driven by the user clicking buttons: "Mark as Read," "Mark as Practiced," "Mark as Confident." The practice tab has retrieval questions, but they're self-graded (click to expand the answer, honor system). The `coach/mastery` endpoint is a stub (`{ status: 'not_implemented' }`). Checkpoint steps exist and `gradeCheckpointFlow` is built, but checkpoint results **don't flow back to `knowledge_progress`**.

**Why it matters:** If mastery is self-reported, it's meaningless. The user can click "confident" on everything and the system believes them. The whole mastery-tracking UX becomes a checkbox chore, not evidence of growth. This will feel hollow fast.

**Suggestion:** Wire checkpoint grades into `knowledge_progress`. When a user scores well on a checkpoint linked to a knowledge unit, auto-promote mastery. When they struggle, the system should note it (not punish — just keep the mastery level honest). The practice tab retrieval questions should also have a "Check Answer" flow (even a simple text-match or Genkit grading call) rather than pure self-assessment. Mastery should be *demonstrated*, not *declared*.

---

### 4. Experience Completion Is an Anticlimax

**What's happening:** The user finishes an experience and sees a green checkmark, a "Congratulations!" message, and a "Back to Library" link. Behind the scenes, synthesis runs (narrative, facets, suggestions). But the user **doesn't see any of that**. They don't see "Here's what you learned." They don't see "Your marketing skills moved from beginner to practicing." They don't see "Here's what to do next." They just see... a congratulations screen.

**Why it matters:** Completion is the single most motivating moment in a learning loop. It's where the user should feel growth. Right now the system computes growth (synthesis snapshots, facet extraction, suggestions) but keeps it all hidden. The user's reward is a static card.

**Suggestion:** The completion screen should surface synthesis results: a 2-3 sentence summary of what was accomplished, any facets that were created or strengthened, and the top 1-2 next suggestions. This data already exists — `synthesis_snapshots` has `summary`, `key_signals`, and `next_candidates`. Just render them. Make completion feel like a level-up, not an exit.

---

### 5. The Two-App Problem — GPT Knows, App Doesn't Speak

**What's happening:** The GPT (in ChatGPT) is the only entity that understands the user's journey holistically. The app itself has no voice. When you're in the workspace doing a challenge, the only intelligence is the tutor chat (which requires the user to actively ask). The app doesn't guide, nudge, or contextualize. It renders and records. If the user opens the app without talking to GPT first, they see a dashboard of separate things but nothing that says "here's what you should focus on today."

**Why it matters:** The user shouldn't need to leave the app and go talk to ChatGPT to get coherence about their own learning journey. The app should have enough embedded intelligence (via Genkit, via pre-computed suggestions, via synthesis data) to give direction on its own.

**Suggestion:** Add a lightweight "Focus" or "Today" section to the home page that uses already-computed data: the most recently active experience, the next uncompleted step, any pending suggestions from `synthesis_snapshots.next_candidates`, and the most recent knowledge domain with incomplete mastery. No new AI calls needed — just surface what the system already knows. The home page should answer: "What should I do right now?" without requiring a GPT conversation.

---

### 6. No "Welcome Back" Moment

**What's happening:** When a user returns after days away, the home page shows the same static sections. There's no "Welcome back — you left off on Step 7 of Marketing Fundamentals" or "While you were away, 3 new knowledge units landed from your research request." The re-entry engine exists conceptually (re-entry contracts on experiences) but the app itself doesn't express temporal awareness.

**Why it matters:** Returning users are the most fragile. If they open the app and have to figure out where they were, they'll close it. The system should reconstruct their context instantly.

**Suggestion:** The "Active Journeys" section on home already shows active experiences. Enhance it: show the last-touched step title, time since last activity ("3 days ago"), and a direct "Resume Step 7 →" link. For knowledge, if new units arrived via MiraK webhook since last visit, show a "New research arrived" badge. This is all data that already exists — `experience_steps.completed_at` timestamps, `knowledge_units.created_at`, interaction event timestamps.

---

### 7. Navigation Is Cluttered with Legacy Plumbing

**What's happening:** The sidebar has 9 items: Inbox, Library, Knowledge, Timeline, Profile, Arena, Icebox, Shipped, Killed. Several of these are from the original idea-management paradigm (Arena, Icebox, Shipped, Killed, Send, Drill). For a user who comes to Mira as a **mastery and learning platform**, most of these are noise. They want: Home, their Track/Goal, their Workspace, Knowledge, and Profile.

**Why it matters:** Navigation signals what the product is. If the sidebar says "Icebox / Shipped / Killed," the product feels like a project tracker. If it says "Goals / Tracks / Knowledge / Profile," it feels like a growth platform. The current nav tells the story of how the product was built, not what it is.

**Suggestion:** Consider a nav restructure for the learning-first identity. Primary nav: **Home, Tracks** (curriculum outlines / goal view), **Knowledge**, **Profile**. Secondary/collapsed: Library (all experiences), Timeline. Legacy surfaces (Arena, Icebox, Shipped, Killed, Inbox) move to a "Studio" or "Ideas" sub-section — or are accessed via the command bar (Cmd+K) only. This doesn't delete anything; it just re-prioritizes the navigation for the mastery use case.

---

### 8. The Coach Is Hidden Behind an Opt-In Gesture

**What's happening:** The TutorChat is embedded in the `KnowledgeCompanion` component at the bottom of step renderers. But it only activates when the step has a `knowledge_domain` AND the user chooses to interact. It doesn't proactively offer help. If the user is struggling on a checkpoint (low score, multiple attempts), the coach doesn't surface. If the user has been on a step for 10 minutes without progress, nothing happens.

**Why it matters:** A coach that only speaks when spoken to isn't a coach — it's a help desk. The Sprint 10 vision ("Coach as inline step tutor") is right, but the current implementation requires the user to know the coach exists and actively seek it out.

**Suggestion:** Add gentle, non-intrusive coach surfacing triggers: after a failed checkpoint attempt ("Need help with this? →"), after extended dwell time on a step without interaction, or after the user opens a step linked to knowledge they haven't read yet ("You might want to review [Unit] first →"). These can be simple conditional UI elements — no new AI calls needed for the trigger, just for the actual coaching conversation.

---

### 9. Practice Tab Retrieval Questions Feel Like Flashcards, Not Growth

**What's happening:** The Practice tab on knowledge units shows retrieval questions as expandable accordions. Click the question, the answer reveals. It's a self-test with no tracking, no scoring, no progression. The questions are Genkit-generated and often good, but the interaction model is passive.

**Why it matters:** For mastery to feel real, practice needs stakes. Even small ones — "You got 4/5 right" or "You've practiced this unit 3 times, improving each time." Without any feedback loop, the Practice tab feels like a feature demo, not a learning tool.

**Suggestion:** Add lightweight practice tracking: count how many times the user has attempted the practice questions, optionally add a simple "Did you get this right?" yes/no per question (still honor system, but now tracked), and show a micro-progress indicator on the Practice tab badge ("Practiced 2x"). This feeds into knowledge_progress and makes the practiced → confident transition feel earned.

---

### 10. Experiences Arrive Fully Formed — No User Agency in Shaping Them

**What's happening:** The GPT creates an experience, it lands in the library as "Proposed," the user clicks "Accept & Start," and the experience activates as-is. The multi-pass enrichment APIs exist (update/add/remove/reorder steps), but they're GPT-facing. The user has no way to say "I want to skip this step" or "Can you make this challenge easier" or "I already know this — let me test out" from inside the app.

**Why it matters:** If the user can't shape their own learning, the system feels imposed rather than collaborative. The GPT is making all the decisions about what to learn and how. The user is just a consumer of experiences.

**Suggestion:** Add lightweight user agency: a "Skip" or "I already know this" option on steps (fires a skip interaction event that the GPT can read during re-entry), a "Make this harder/easier" button that queues a GPT enrichment pass, or a simple "Suggest changes" textarea on the experience overview. Even symbolic agency ("I chose to skip this") changes the dynamic from "I'm being taught" to "I'm directing my learning."

---

### Summary: The Core UX Risk

The system is technically impressive — the backend tracks curriculum, mastery, facets, synthesis, knowledge links, and re-entry contracts. But **almost none of that intelligence is visible to the user**. The app renders experiences and records telemetry, but it doesn't reflect the user's growth back to them. The danger is that Mira feels like "a place where I do assignments" rather than "a system that's helping me master something."

The fix isn't more backend capability — it's **surfacing what already exists**. Synthesis results on completion screens. Curriculum outlines on the home page. Knowledge links inside steps. Mastery earned through checkpoints. A coach that notices when you're stuck. A home page that says "focus here today." Most of this data is already computed and stored. The UX just needs to let it breathe.

```

### start.sh

```bash
#!/usr/bin/env bash
# start.sh — Kill old processes, start dev server + Cloudflare tunnel
# Tunnel: mira.mytsapi.us → localhost:3000

set -e
cd "$(dirname "$0")"

echo "🧹 Killing old processes..."

# Kill any node process on port 3000
for pid in $(netstat -ano 2>/dev/null | grep ':3000 ' | grep LISTENING | awk '{print $5}' | sort -u); do
  echo "  Killing PID $pid (port 3000)"
  taskkill //F //PID "$pid" 2>/dev/null || true
done

# Kill any existing cloudflared tunnel
taskkill //F //IM cloudflared.exe 2>/dev/null && echo "  Killed cloudflared" || echo "  No cloudflared running"

sleep 1

echo ""
echo "🚀 Starting Next.js dev server..."
npm run dev &
DEV_PID=$!

# Wait for the dev server to be ready
echo "⏳ Waiting for localhost:3000..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
    echo "✅ Dev server ready on http://localhost:3000"
    break
  fi
  sleep 1
done

echo ""
echo "🌐 Starting Cloudflare tunnel → mira.mytsapi.us"
cloudflared tunnel run &
TUNNEL_PID=$!

echo ""
echo "============================================"
echo "  Mira Studio is running!"
echo "  Local:  http://localhost:3000"
echo "  Tunnel: https://mira.mytsapi.us"
echo "  Webhook: https://mira.mytsapi.us/api/webhook/github"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop everything."

# Trap Ctrl+C to kill both processes
trap 'echo "Shutting down..."; kill $DEV_PID $TUNNEL_PID 2>/dev/null; exit 0' INT TERM

# Wait for either to exit
wait

```

### tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        studio: {
          bg: '#0a0a0f',
          surface: '#12121a',
          border: '#1e1e2e',
          muted: '#2a2a3a',
          accent: '#6366f1',
          'accent-hover': '#818cf8',
          text: '#e2e8f0',
          'text-muted': '#94a3b8',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          ice: '#38bdf8',
        },
      },
    },
  },
  plugins: [],
}
export default config

```

### tsconfig.json

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "paths": {"@/*": ["./*"]}
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

```

### types/agent-run.ts

```typescript
/**
 * types/agent-run.ts
 * Represents a single AI-agent or GitHub workflow execution triggered by Mira.
 */

import type { ExecutionMode } from '@/lib/constants'

export type AgentRunKind =
  | 'prototype'
  | 'fix_request'
  | 'spec'
  | 'research_summary'
  | 'copilot_issue_assignment'

export type AgentRunStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'blocked'

export interface AgentRun {
  id: string
  projectId: string
  taskId?: string
  kind: AgentRunKind
  status: AgentRunStatus
  executionMode: ExecutionMode
  triggeredBy: string
  githubWorkflowRunId?: string
  githubIssueNumber?: number
  startedAt: string
  finishedAt?: string
  summary?: string
  error?: string
}

```

### types/api.ts

```typescript
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

```

### types/change-report.ts

```typescript
export type ChangeReportType = 'bug' | 'ux' | 'idea' | 'change' | 'comment'

export interface ChangeReport {
  id: string
  type: ChangeReportType
  url: string
  content: string
  status: 'open' | 'resolved'
  createdAt: string
}

export interface CreateChangeReportPayload {
  type: ChangeReportType
  url: string
  content: string
}

```

### types/curriculum.ts

```typescript
// types/curriculum.ts
import { CurriculumStatus, StepKnowledgeLinkType } from '@/lib/constants';

/**
 * A curriculum outline scopes the learning problem before experiences are generated.
 * TS Application Shape (camelCase)
 */
export interface CurriculumOutline {
  id: string;
  userId: string;
  topic: string;
  domain?: string | null;
  /** semantic signals found during discovery (e.g. friction points, user level) */
  discoverySignals: Record<string, any>;
  subtopics: CurriculumSubtopic[];
  /** IDs of knowledge units that already exist and support this outline */
  existingUnitIds: string[];
  /** subtopics that still require research dispatch */
  researchNeeded: string[];
  pedagogicalIntent: string;
  estimatedExperienceCount?: number | null;
  status: CurriculumStatus;
  goalId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumSubtopic {
  title: string;
  description: string;
  /** Links to the experience generated for this subtopic */
  experienceId?: string | null;
  /** Links to knowledge units that support this subtopic */
  knowledgeUnitIds?: string[];
  order: number;
  status: 'pending' | 'in_progress' | 'completed';
}

/**
 * Pivot table linking an experience step to a knowledge unit with a specific pedagogical intent.
 * TS Application Shape (camelCase)
 */
export interface StepKnowledgeLink {
  id: string;
  stepId: string;
  knowledgeUnitId: string;
  linkType: StepKnowledgeLinkType;
  createdAt: string;
}

/**
 * DB Row Types (snake_case)
 * Used by services for normalization (fromDB/toDB)
 */
export interface CurriculumOutlineRow {
  id: string;
  user_id: string;
  topic: string;
  domain: string | null;
  discovery_signals: any; // JSONB
  subtopics: any;         // JSONB
  existing_unit_ids: any; // JSONB
  research_needed: any;   // JSONB
  pedagogical_intent: string;
  estimated_experience_count: number | null;
  status: CurriculumStatus;
  goal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StepKnowledgeLinkRow {
  id: string;
  step_id: string;
  knowledge_unit_id: string;
  link_type: StepKnowledgeLinkType;
  created_at: string;
}

```

### types/drill.ts

```typescript
export type DrillDisposition = 'arena' | 'icebox' | 'killed'

export interface DrillSession {
  id: string
  ideaId: string
  intent: string
  successMetric: string
  scope: 'small' | 'medium' | 'large'
  executionPath: 'solo' | 'assisted' | 'delegated'
  urgencyDecision: 'now' | 'later' | 'never'
  finalDisposition: DrillDisposition
  completedAt?: string
}

```

### types/experience.ts

```typescript
// types/experience.ts
import {
  ExperienceClass,
  ExperienceStatus,
  ResolutionDepth,
  ResolutionMode,
  ResolutionTimeScope,
  ResolutionIntensity,
} from '@/lib/constants';
import { StepKnowledgeLink } from './curriculum';

export type {
  ExperienceClass,
  ExperienceStatus,
  ResolutionDepth,
  ResolutionMode,
  ResolutionTimeScope,
  ResolutionIntensity,
};

export type InstanceType = 'persistent' | 'ephemeral';

export interface Resolution {
  depth: ResolutionDepth;
  mode: ResolutionMode;
  timeScope: ResolutionTimeScope;
  intensity: ResolutionIntensity;
}

export interface ReentryContract {
  trigger: 'time' | 'completion' | 'inactivity' | 'manual';
  prompt: string;
  contextScope: 'minimal' | 'full' | 'focused';
  timeAfterCompletion?: string; // e.g. '24h', '7d'
}

export interface ExperienceTemplate {
  id: string;
  slug: string;
  name: string;
  class: ExperienceClass;
  renderer_type: string;
  schema_version: number;
  config_schema: any; // JSONB
  status: 'active' | 'deprecated';
  created_at: string;
}

export interface ExperienceInstance {
  id: string;
  user_id: string;
  idea_id?: string | null;
  template_id: string;
  title: string;
  goal: string;
  instance_type: InstanceType;
  status: ExperienceStatus;
  resolution: Resolution;
  reentry?: ReentryContract | null;
  previous_experience_id?: string | null;
  next_suggested_ids?: string[];
  friction_level?: 'low' | 'medium' | 'high' | null;
  source_conversation_id?: string | null;
  generated_by?: string | null;
  realization_id?: string | null;
  curriculum_outline_id?: string | null;
  created_at: string;
  published_at?: string | null;
}

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface ExperienceStep {
  id: string;
  instance_id: string;
  step_order: number;
  step_type: string;
  title: string;
  payload: any; // JSONB
  completion_rule?: string | null;
  status?: StepStatus;
  scheduled_date?: string | null;     // ISO 8601 date (no time)
  due_date?: string | null;           // ISO 8601 date (no time)
  estimated_minutes?: number | null;  // estimated time to complete
  completed_at?: string | null;       // ISO 8601 timestamp
  knowledge_links?: StepKnowledgeLink[];
}

```

### types/external-ref.ts

```typescript
/**
 * types/external-ref.ts
 * Maps a local Mira entity (project, PR, task, agent_run) to an external
 * provider record (GitHub issue/PR, Vercel deployment, etc.).
 * Used for reverse-lookup: GitHub event → local entity.
 */

export type ExternalProvider = 'github' | 'vercel' | 'supabase'

export interface ExternalRef {
  id: string
  entityType: 'project' | 'pr' | 'task' | 'agent_run'
  entityId: string
  provider: ExternalProvider
  externalId: string
  externalNumber?: number
  url?: string
  createdAt: string
}

```

### types/github.ts

```typescript
/**
 * types/github.ts
 * Shared GitHub-specific types used across the webhook pipeline,
 * adapter, and services.
 */

export type GitHubEventType =
  | 'issues'
  | 'issue_comment'
  | 'pull_request'
  | 'pull_request_review'
  | 'workflow_run'
  | 'push'

export interface GitHubIssuePayload {
  action: string
  issue: {
    number: number
    title: string
    html_url: string
    state: string
    assignee?: { login: string }
  }
  repository: {
    full_name: string
    owner: { login: string }
    name: string
  }
}

export interface GitHubPRPayload {
  action: string
  pull_request: {
    number: number
    title: string
    html_url: string
    state: string
    head: { sha: string; ref: string }
    base: { ref: string }
    draft: boolean
    mergeable?: boolean
  }
  repository: {
    full_name: string
    owner: { login: string }
    name: string
  }
}

export interface GitHubWorkflowRunPayload {
  action: string
  workflow_run: {
    id: number
    name: string
    status: string
    conclusion: string | null
    html_url: string
    head_sha: string
  }
  repository: {
    full_name: string
    owner: { login: string }
    name: string
  }
}

```

### types/goal.ts

```typescript
// types/goal.ts
import { GoalStatus } from '@/lib/constants';

export type { GoalStatus };

/**
 * A Goal is the top-level container in Goal OS.
 * Goals sit above curriculum outlines and skill domains.
 * TS Application Shape (camelCase)
 */
export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: GoalStatus;
  /** Skill domain names (denormalized for quick reads) */
  domains: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * DB Row Type (snake_case)
 * Used by services for normalization (fromDB/toDB)
 */
export interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  domains: any;       // JSONB
  created_at: string;
  updated_at: string;
}

```

### types/graph.ts

```typescript
export interface ExperienceGraphEdge {
  fromInstanceId: string;
  toInstanceId: string;
  edgeType: 'chain' | 'suggestion' | 'loop' | 'branch';
  metadata?: Record<string, any>;
}

export interface ExperienceChainContext {
  previousExperience: { id: string; title: string; status: string; class: string } | null;
  suggestedNext: { id: string; title: string; reason: string }[];
  chainDepth: number;
  resolutionCarryForward: boolean;
}

export interface ProgressionRule {
  fromClass: string;
  toClass: string;
  condition: 'completion' | 'score_threshold' | 'time_elapsed' | 'always';
  resolutionEscalation: boolean;
  reason: string;
}

```

### types/idea.ts

```typescript
export type IdeaStatus =
  | 'captured'
  | 'drilling'
  | 'arena'
  | 'icebox'
  | 'shipped'
  | 'killed'

export interface Idea {
  id: string
  title: string
  raw_prompt: string
  gpt_summary: string
  vibe: string
  audience: string
  intent: string
  created_at: string
  status: IdeaStatus
}

```

### types/inbox.ts

```typescript
export type InboxEventType =
  | 'idea_captured'
  | 'idea_deferred'
  | 'drill_completed'
  | 'project_promoted'
  | 'task_created'
  | 'pr_opened'
  | 'preview_ready'
  | 'build_failed'
  | 'merge_completed'
  | 'project_shipped'
  | 'project_killed'
  | 'changes_requested'
  // GitHub lifecycle events
  | 'github_issue_created'
  | 'github_issue_closed'
  | 'github_workflow_dispatched'
  | 'github_workflow_failed'
  | 'github_workflow_succeeded'
  | 'github_pr_opened'
  | 'github_pr_merged'
  | 'github_review_requested'
  | 'github_changes_requested'
  | 'github_copilot_assigned'
  | 'github_sync_failed'
  | 'github_connection_error'
  // Knowledge lifecycle events
  | 'knowledge_ready'
  | 'knowledge_updated'

export interface InboxEvent {
  id: string
  projectId?: string
  type: InboxEventType
  title: string
  body: string
  timestamp: string
  severity: 'info' | 'warning' | 'error' | 'success'
  actionUrl?: string
  githubUrl?: string
  read: boolean
}

```

### types/interaction.ts

```typescript
// types/interaction.ts

export type InteractionEventType =
  | 'step_viewed'
  | 'answer_submitted'
  | 'task_completed'
  | 'step_skipped'
  | 'time_on_step'
  | 'experience_started'
  | 'experience_completed'
  | 'draft_saved'
  | 'checkpoint_graded'
  | 'checkpoint_graded_batch';

export interface InteractionEvent {
  id: string;
  instance_id: string;
  step_id: string | null;
  event_type: InteractionEventType;
  event_payload: any; // JSONB
  created_at: string;
}

export interface Artifact {
  id: string;
  instance_id: string;
  artifact_type: string;
  title: string;
  content: string;
  metadata: any; // JSONB
}

```

### types/knowledge.ts

```typescript
// types/knowledge.ts
import {
  KnowledgeUnitType,
  MasteryStatus,
} from '@/lib/constants';

export type { KnowledgeUnitType, MasteryStatus };

export interface KnowledgeCitation {
  url: string;
  claim: string;
  confidence: number;
}

export interface RetrievalQuestion {
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface KnowledgeAudioVariant {
  format: 'script_skeleton';
  sections: Array<{
    heading: string;
    narration: string;
    duration_estimate_seconds: number;
  }>;
}

export interface KnowledgeUnit {
  id: string;
  user_id: string;
  topic: string;
  domain: string;
  unit_type: KnowledgeUnitType;
  title: string;
  thesis: string;
  content: string;
  key_ideas: string[];
  common_mistake: string | null;
  action_prompt: string | null;
  retrieval_questions: RetrievalQuestion[];
  citations: KnowledgeCitation[];
  linked_experience_ids: string[];
  source_experience_id: string | null;
  subtopic_seeds: string[];
  mastery_status: MasteryStatus;
  curriculum_outline_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeProgress {
  id: string;
  user_id: string;
  unit_id: string;
  mastery_status: MasteryStatus;
  last_studied_at: string | null;
  created_at: string;
}

export interface MiraKWebhookPayload {
  topic: string;
  domain: string;
  session_id?: string;
  experience_id?: string;  // If set, webhook enriches this experience instead of creating new
  units: Array<{
    unit_type: KnowledgeUnitType;
    title: string;
    thesis: string;
    content: string;
    key_ideas: string[];
    common_mistake?: string;
    action_prompt?: string;
    retrieval_questions?: RetrievalQuestion[];
    citations?: KnowledgeCitation[];
    subtopic_seeds?: string[];
    audio_variant?: KnowledgeAudioVariant;
  }>;
  experience_proposal?: {
    title: string;
    goal: string;
    template_id: string;
    resolution: { depth: string; mode: string; timeScope: string; intensity: string };
    steps: Array<{ step_type: string; title: string; payload: any }>;
  };
}


```

### types/pr.ts

```typescript
export type PRStatus = 'open' | 'merged' | 'closed'
export type BuildState = 'pending' | 'running' | 'success' | 'failed'
export type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'merged'

export interface PullRequest {
  id: string
  projectId: string
  title: string
  branch: string
  status: PRStatus
  previewUrl?: string
  buildState: BuildState
  mergeable: boolean
  requestedChanges?: string
  reviewStatus?: ReviewStatus
  /** Local sequential PR number (used before GitHub sync) */
  number: number
  author: string
  createdAt: string
  // GitHub integration fields (all optional)
  /** Real GitHub PR number — distinct from the local `number` field */
  githubPrNumber?: number
  githubPrUrl?: string
  githubBranchRef?: string
  headSha?: string
  baseBranch?: string
  checksUrl?: string
  lastGithubSyncAt?: string
  workflowRunId?: string
  source?: 'local' | 'github'
}

```

### types/profile.ts

```typescript
// types/profile.ts

export type FacetType = 'interest' | 'skill' | 'goal' | 'effort_area' | 'preferred_depth' | 'preferred_mode' | 'friction_pattern'

export interface ProfileFacet {
  id: string;
  user_id: string;
  facet_type: FacetType;
  value: string;
  confidence: number; // 0.0 to 1.0
  evidence?: string | null;
  source_snapshot_id?: string | null;
  updated_at: string;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  facets: ProfileFacet[];
  topInterests: string[];
  topSkills: string[];
  activeGoals: string[];
  experienceCount: { 
    total: number; 
    completed: number; 
    active: number; 
    ephemeral: number;
    completionRate: number;
    mostActiveClass: string | null;
    averageFriction: number;
  };
  preferredDepth: string | null;
  preferredMode: string | null;
  memberSince: string;
}

export interface FacetUpdate {
  facet_type: FacetType;
  value: string;
  confidence: number;
  evidence?: string;
  source_snapshot_id?: string;
}

```

### types/project.ts

```typescript
import type { ExecutionMode } from '@/lib/constants'

export type ProjectState = 'arena' | 'icebox' | 'shipped' | 'killed'
export type ProjectHealth = 'green' | 'yellow' | 'red'

export interface Project {
  id: string
  ideaId: string
  name: string
  summary: string
  state: ProjectState
  health: ProjectHealth
  currentPhase: string
  nextAction: string
  activePreviewUrl?: string
  createdAt: string
  updatedAt: string
  shippedAt?: string
  killedAt?: string
  killedReason?: string
  // GitHub integration fields (all optional — local-only projects remain valid)
  githubOwner?: string
  githubRepo?: string
  githubIssueNumber?: number
  githubIssueUrl?: string
  executionMode?: ExecutionMode
  githubWorkflowStatus?: string
  copilotAssignedAt?: string
  copilotPrNumber?: number
  copilotPrUrl?: string
  lastSyncedAt?: string
  /** Placeholder for future GitHub App migration */
  githubInstallationId?: string
  /** Placeholder for future GitHub App migration */
  githubRepoFullName?: string
}

```

### types/skill.ts

```typescript
// types/skill.ts
import { SkillMasteryLevel } from '@/lib/constants';

export type { SkillMasteryLevel };

/**
 * A SkillDomain represents a knowledge/competency area within a Goal.
 * Mastery is computed from linked experience completions + knowledge unit progress.
 * TS Application Shape (camelCase)
 */
export interface SkillDomain {
  id: string;
  userId: string;
  goalId: string;
  name: string;
  description: string;
  masteryLevel: SkillMasteryLevel;
  /** Knowledge unit IDs linked to this domain */
  linkedUnitIds: string[];
  /** Experience instance IDs linked to this domain */
  linkedExperienceIds: string[];
  /** Total evidence count (completed experiences + confident knowledge units) */
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * DB Row Type (snake_case)
 * Used by services for normalization (fromDB/toDB)
 */
export interface SkillDomainRow {
  id: string;
  user_id: string;
  goal_id: string;
  name: string;
  description: string | null;
  mastery_level: string;
  linked_unit_ids: any;         // JSONB
  linked_experience_ids: any;   // JSONB
  evidence_count: number;
  created_at: string;
  updated_at: string;
}

```

### types/synthesis.ts

```typescript
// types/synthesis.ts
import { ExperienceInstance } from './experience';
import { ActiveReentryPrompt } from '@/lib/experience/reentry-engine';

import { ProfileFacet, FacetType } from './profile';

export type FrictionLevel = 'low' | 'medium' | 'high';

export interface SynthesisSnapshot {
  id: string;
  user_id: string;
  source_type: string;
  source_id: string; // UUID
  summary: string;
  key_signals: any; // JSONB
  next_candidates: string[]; // JSONB
  facets?: ProfileFacet[]; // Joined in for UI
  created_at: string;
}

export interface GPTStatePacket {
  latestExperiences: ExperienceInstance[];
  activeReentryPrompts: ActiveReentryPrompt[];
  frictionSignals: { instanceId: string; level: FrictionLevel }[];
  suggestedNext: string[];
  synthesisSnapshot: SynthesisSnapshot | null;
  proposedExperiences: ExperienceInstance[];
  compressedState?: {
    narrative: string;
    prioritySignals: string[];
    suggestedOpeningTopic: string;
  };
  reentryCount?: number;
}

```

### types/task.ts

```typescript
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked'

export interface Task {
  id: string
  projectId: string
  title: string
  status: TaskStatus
  priority: 'low' | 'medium' | 'high'
  linkedPrId?: string
  createdAt: string
  // GitHub integration fields (all optional)
  githubIssueNumber?: number
  githubIssueUrl?: string
  source?: 'local' | 'github'
  parentTaskId?: string
}

```

### types/timeline.ts

```typescript
export type TimelineCategory = 'experience' | 'idea' | 'system' | 'github'

export interface TimelineEntry {
  id: string;
  timestamp: string;
  category: TimelineCategory;
  title: string;
  body?: string;
  entityId?: string;
  entityType?: 'experience' | 'idea' | 'project' | 'pr' | 'knowledge';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface TimelineFilter {
  category?: TimelineCategory;
  dateRange?: { from: string; to: string };
  limit?: number;
}

export interface TimelineStats {
  totalEvents: number;
  experienceEvents: number;
  ideaEvents: number;
  systemEvents: number;
  githubEvents: number;
  thisWeek: number;
}

```

### types/webhook.ts

```typescript
export interface WebhookPayload {
  source: 'gpt' | 'github' | 'vercel'
  event: string
  data: Record<string, unknown>
  signature?: string
  timestamp: string
}
// GitHub-specific webhook context parsed from headers + body
export interface GitHubWebhookContext {
  event: string                    // x-github-event header
  action: string                   // body.action
  delivery: string                 // x-github-delivery header
  repositoryFullName: string       // body.repository.full_name
  sender: string                   // body.sender.login
  rawPayload: Record<string, unknown>
}

export type GitHubWebhookHandler = (ctx: GitHubWebhookContext) => Promise<void>

```

### update_openapi.py

```python
import yaml
import copy

with open("public/openapi.yaml", "r", encoding="utf-8") as f:
    schema = yaml.safe_load(f)

# Update servers to relative path / domain-agnostic
schema["servers"] = [{"url": "https://mira.mytsapi.us", "description": "Update this URL in Custom GPT actions to your current hosted domain"}]

# Or even better, just leave it as is if it expects a full domain, but we can set it to {domain}
# Let's use `https://your-domain.com` as a placeholder 
schema["servers"] = [{"url": "/", "description": "Current hosted domain"}]

# Add new endpoints
paths = schema["paths"]

paths["/api/experiences/{id}/chain"] = {
    "get": {
        "operationId": "getExperienceChain",
        "summary": "Get full chain context for an experience",
        "description": "Returns upstream and downstream linked experiences in the graph.",
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "schema": {"type": "string", "format": "uuid"},
                "description": "Experience instance ID"
            }
        ],
        "responses": {
            "200": {"description": "Experience chain context"}
        }
    },
    "post": {
        "operationId": "linkExperiences",
        "summary": "Link this experience to another",
        "description": "Creates an edge (chain, loop, branch, suggestion) defining relationship.",
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "schema": {"type": "string", "format": "uuid"}
            }
        ],
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "required": ["targetId", "edgeType"],
                        "properties": {
                            "targetId": {"type": "string", "format": "uuid"},
                            "edgeType": {"type": "string", "enum": ["chain", "suggestion", "loop", "branch"]}
                        }
                    }
                }
            }
        },
        "responses": {
            "200": {"description": "Updated source experience"}
        }
    }
}

paths["/api/experiences/{id}/steps"] = {
    "get": {
        "operationId": "getExperienceSteps",
        "summary": "Get all steps for an experience",
        "description": "Returns the ordered sequence of steps for this experience.",
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "schema": {"type": "string", "format": "uuid"}
            }
        ],
        "responses": {
            "200": {"description": "Array of steps"}
        }
    },
    "post": {
        "operationId": "addExperienceStep",
        "summary": "Add a new step to an existing experience",
        "description": "Appends a new step dynamically to the experience instance.",
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "schema": {"type": "string", "format": "uuid"}
            }
        ],
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "required": ["type", "title", "payload"],
                        "properties": {
                            "type": {"type": "string"},
                            "title": {"type": "string"},
                            "payload": {"type": "object"},
                            "completion_rule": {"type": "string", "nullable": True}
                        }
                    }
                }
            }
        },
        "responses": {
            "201": {"description": "Created step"}
        }
    }
}

paths["/api/experiences/{id}/suggestions"] = {
    "get": {
        "operationId": "getExperienceSuggestions",
        "summary": "Get suggested next experiences",
        "description": "Returns templated suggestions based on graph mappings and completions.",
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "schema": {"type": "string", "format": "uuid"}
            }
        ],
        "responses": {
            "200": {"description": "Array of suggestions"}
        }
    }
}

with open("public/openapi.yaml", "w", encoding="utf-8") as f:
    yaml.dump(schema, f, sort_keys=False, default_flow_style=False)

```

### ux.md

```markdown
# Mira Studio — UX Audit & Suggestions (March 2026)

> Based on a full read of the roadmap, the actual codebase (post-Sprint 13 Goal OS), the MiraK agent pipeline, and the GPT instructions. These are the things that will feel weird, broken, or hollow to a user trying to use Mira as an open-world mastery platform.

---

## Where Things Stand

Sprint 13 shipped Goal OS + Skill Tree. The structural hierarchy is now: **Goal → Skill Domains → Curriculum Outlines → Experiences → Steps**. The home page shows the active goal, a "Focus Today" card, curriculum outlines ("Your Path"), and a knowledge summary. The `/skills` page renders domain cards with mastery badges. Completion screen shows goal trajectory. The backend is rich — mastery engine, batch grading, home summary service, GPT state with goal context.

MiraK delivers 2 knowledge units per research run (foundation + playbook) via a 5-agent pipeline. Audio scripts are generated but not delivered. No depth control — every request gets the full pipeline. No multi-pass research. No caching.

The GPT creates goals, plans curricula, generates experiences, and references goal context in re-entry. The Gemini coach (tutor chat) lives inside `KnowledgeCompanion` at the bottom of steps.

---

## The Big Picture Problem

The system is architecturally goal-aware but **experientially flat**. A user with an active goal, 6 skill domains, 3 curriculum outlines, 12 experiences, and 8 knowledge units still feels like they're doing "one thing at a time in isolation." The connective tissue — the thing that makes this feel like a growth system with a destination — is computed but not shown.

The product thesis is: *"The system progressively reveals what they didn't know they didn't know — through action, not reading lists."* Right now, it reveals through reading lists. The experiences and knowledge are structurally linked but the user doesn't feel the link.

---

## 1. The Skill Tree Is a Scoreboard, Not a Map

**What's happening:** `/skills` shows domain cards with mastery badges (undiscovered → expert) and progress bars. But the cards don't tell you what to *do*. The "next action" link goes to the first linked experience, but there's no sense of "this domain has 3 experiences, you've done 1, here's what's next." The domains are tiles on a wall, not nodes on a journey.

**Why it feels weird:** The user sees "Memory Management: beginner" and "Concurrency: undiscovered" but can't answer: "What do I need to do to level up Memory Management?" or "How far am I from proficient?" The mastery engine computes this (evidence thresholds are defined) but the UI doesn't expose the requirements.

**Suggestion:** Each domain card should show: (a) current mastery level, (b) what's needed for the next level ("2 more completed experiences to reach practicing"), (c) a direct link to the next uncompleted experience in that domain. The card becomes a micro-roadmap, not just a badge. Consider a detail view when you tap a domain — showing all linked experiences (completed and pending) and knowledge units.

---

## 2. "Focus Today" Needs Teeth

**What's happening:** The home page has a "Focus Today" card showing the most recent experience with a "Resume" link. But it's just recency-based — no intelligence about what's highest-leverage. The GPT knows which domain to suggest (it's in the re-entry logic), but the app itself doesn't prioritize.

**Why it feels weird:** If you have 3 active experiences across different domains, "Focus Today" shows whichever you touched last. But maybe the one you *should* focus on is the checkpoint you failed yesterday, or the domain that's closest to leveling up, or the experience with a due date.

**Suggestion:** Rank the focus card by a simple priority heuristic: (1) experiences with upcoming due dates, (2) domains closest to a mastery threshold ("1 more experience to reach practicing"), (3) experiences with unfinished checkpoints, (4) recency fallback. This doesn't need AI — just a sort function over data that already exists. The user should open the app and feel like it knows what matters today.

---

## 3. Knowledge Arrives but Doesn't Integrate Into the Learning Flow

**What's happening:** MiraK delivers foundation + playbook units. They land in `/knowledge` organized by domain. Steps can link to knowledge via `step_knowledge_links` and `KnowledgeCompanion` fetches linked units. But the experience of knowledge is: you go to the Knowledge page and read. Or you happen to see the companion at the bottom of a step.

**Why it feels weird:** Knowledge and experiences are parallel tracks. You study a knowledge unit, then separately do an experience. The knowledge unit doesn't say "this prepares you for Step 3 of your active experience." The experience step doesn't say "you studied this yesterday — now apply it." There's no temporal narrative connecting reading → doing → proving.

**Suggestion:** Three concrete changes:
- **Pre-step primer**: When a step has linked knowledge, show a small callout *above* the step content: "Before you start — review [Unit Title]" with a direct link. If the user has already read it (mastery >= read), show "You've studied this — now apply it."
- **Post-completion knowledge reveal**: When a step completes, if there's linked knowledge marked as "deep dive," surface it: "Go deeper: [Unit Title]." This is Sprint 10 Lane 3's "knowledge timing" but needs to actually ship.
- **Knowledge unit back-links**: On the knowledge unit detail page, show "Used in: [Experience Title, Step 4]" — so when you're browsing knowledge, you can see where it fits in your learning path.

---

## 4. MiraK Produces Dense Content but the App Serves It Raw

**What's happening:** The foundation unit from MiraK is a comprehensive reference document — executive summary, mechanics, workflows, KPIs, 30-day calendar, compliance sections. It's *excellent* reference material. But it lands in the Knowledge tab as a single long-form document. The user sees a wall of text with a "Mark as Read" button.

**Why it feels weird for mastery:** Dense reference material is great for lookup but bad for learning. The user needs to *absorb* it, not just *read* it. The Practice tab has retrieval questions, but they're disconnected from the reading experience — you read the whole thing, switch to Practice tab, answer some self-graded flashcards.

**Suggestion:** Consider breaking the knowledge consumption experience into phases:
- **Skim phase**: Show just the thesis + key ideas + executive summary. This is the "aware" level.
- **Study phase**: Full content with inline micro-checkpoints — "What did you just learn about X?" every few sections. Not the Practice tab questions — contextual checks embedded in the reading flow.
- **Practice phase**: The existing retrieval questions, but now with lightweight tracking (attempted/passed).
- **Apply phase**: Link to the next experience step that uses this knowledge.

This is a bigger UX investment but it's the difference between "a library" and "a learning system." Even just the skim/study split would help — show the executive summary first, let them expand into the full content.

---

## 5. Checkpoint Grading Closes the Loop — But the User Doesn't Feel It

**What's happening:** Batch grading is wired. Checkpoint results flow back with correct/incorrect + feedback + misconception analysis. Knowledge progress gets promoted when confidence > 0.7. Mastery recomputes on experience completion. The pipeline works.

**Why it feels weird:** The user answers a checkpoint question and sees "Correct!" or "Incorrect" with feedback. But they don't see: "Your mastery of Marketing Fundamentals just moved from beginner to practicing." The mastery update happens silently in the background. The checkpoint feels like a quiz, not a growth event.

**Suggestion:** When a checkpoint answer triggers a knowledge progress promotion or contributes to a mastery level change, surface it inline: a small toast or callout: "Evidence recorded — Marketing Fundamentals: 3/5 toward practicing." On the completion screen, the goal trajectory section already exists — enhance it to show *which domains moved* during this experience, not just the aggregate progress bar.

---

## 6. The Coach Is Buried and Passive

**What's happening:** The Gemini tutor chat lives in `KnowledgeCompanion` at the bottom of steps. It activates when a step has a `knowledge_domain`. The user has to scroll down, notice it exists, and actively type a question. If they're struggling on a checkpoint, nothing surfaces. If they've been stuck on a step for 10 minutes, nothing happens.

**Why it feels weird:** A mastery platform without proactive coaching feels like self-study with extra steps. The coach should feel like it's watching — not surveilling, but *noticing*. "I see you missed this checkpoint question — want to review the concept?" is a fundamentally different experience from "there's a chat box at the bottom if you need it."

**Suggestion:** Add coach surfacing triggers:
- After a failed checkpoint answer: Show an inline prompt "Need help understanding this? Talk to your coach →" that pre-fills context.
- After the user opens a step linked to knowledge they haven't read: "You might want to review [Unit] first →" with a link.
- On the checkpoint results screen (when score is low): "Your coach can help with the concepts you missed →" with a direct link to tutor chat pre-loaded with the missed questions.

These are simple conditional UI elements — the tutor chat infrastructure already works. The triggers just need to exist.

---

## 7. Experience Completion Is Still an Anticlimax (Partially Fixed)

**What's happening:** The completion screen now shows Goal Trajectory (goal title, proficient domain count, progress bar, link to /skills). It also shows Key Signals, Growth Indicators, and Next Steps from synthesis. This is a real improvement over the previous "Congratulations!" card.

**What's still missing:** The synthesis results (narrative, behavioral signals, next candidates) come from the Genkit flow — but they require the flow to actually run and return data. If synthesis is slow or the flow isn't configured, the completion screen shows static sections. More importantly, the completion screen doesn't show *what specifically changed* — "You completed 3 checkpoints, your Marketing domain moved from aware to beginner, and here's what the coach noticed about your approach."

**Suggestion:** Make the completion screen a mini-retrospective:
- "What you did": Step count, checkpoint scores, time spent, drafts written.
- "What moved": Specific mastery changes (domain X: aware → beginner). This data exists — the mastery recompute just happened.
- "What's next": Top 1-2 suggestions (from synthesis `next_candidates` or from the curriculum outline's next subtopic).

---

## 8. Multiple GPT Sessions Create Fragmented Journeys

**What's happening:** The user has multiple ChatGPT sessions over days/weeks. Each session calls `getGPTState` and gets the current snapshot (active goal, domain mastery, curriculum outlines, recent experiences). But each session starts fresh — the GPT has no memory of what it said last time, only what the app tells it via the state endpoint.

**Why it feels weird:** Session 1: "Let's research AI operators." Session 2: "Let's deepen marketing." Session 3: "Wait, what were we doing?" The GPT state packet includes the goal and domain mastery, but it doesn't include a narrative of *what happened across sessions*. The compressed state has a narrative, but it's about experiences, not about the conversation trajectory.

**Suggestion:** Add a `session_history` field to the GPT state packet — a compressed log of what was discussed/decided in the last 3-5 sessions. Not full transcripts — just: "Session 1 (Mar 25): Created goal 'AI Operator Brand', researched 3 domains. Session 2 (Mar 27): Deepened marketing domain, user completed first experience." This gives the GPT conversational continuity without relying on ChatGPT's memory (which is unreliable across custom GPT sessions). The data exists in interaction events and timeline — it just needs compression.

---

## 9. The "Open World" Doesn't Feel Open Yet

**What's happening:** Skill domains start as `undiscovered` and level up through evidence. This is the right structure for progressive revelation. But right now, domains are created at goal creation time — the GPT or MiraK decides the full domain list upfront. The user never *discovers* a new domain. They just see all domains from day one (mostly "undiscovered").

**Why it feels weird:** The thesis says "the system progressively reveals what they didn't know they didn't know." But if all 8 domains are visible from the start (just at undiscovered level), there's nothing to reveal. It's a checklist, not exploration.

**Suggestion:** Consider a "fog of war" approach to domain discovery. Start with 2-3 core domains visible. As the user completes experiences or MiraK delivers research, new domains are *revealed*: "Your research into marketing uncovered a new skill domain: Content Distribution." The `undiscovered` mastery level should mean *literally not yet shown*, not "shown with a gray badge." This creates genuine moments of discovery. The domain creation infrastructure already supports adding domains after goal creation — it just needs to be sequenced instead of batch-created.

---

## 10. MiraK Needs Depth Control and Domain-Aware Research

**What's happening:** Every `/generate_knowledge` call runs the same 5-agent pipeline regardless of context. Researching "what is content marketing" runs the same comprehensive pipeline as "advanced attribution modeling for multi-touch B2B funnels." There's no concept of "light research for awareness" vs. "deep research for mastery."

**Why it matters for the UX:** The user's experience with knowledge should evolve. Early research (when a domain is undiscovered/aware) should be broad and orienting. Later research (when practicing/proficient) should be deep and tactical. Right now every research run produces the same density.

**Suggestion for MiraK:**
- Add a `depth` parameter to `/generate_knowledge`: `'survey' | 'standard' | 'deep'`
  - `survey`: 3 angles, 3-4 URLs, short synthesis — produces a map of the territory
  - `standard`: Current behavior (5-7 angles, 6-8 URLs, comprehensive)
  - `deep`: 10+ angles, 10+ URLs, multiple synthesis passes — produces authoritative reference
- Add a `domain_context` parameter: what the user already knows (their mastery level, previous units in this domain). The strategist can avoid re-researching basics if the user is already at "practicing" level.
- Deliver the audio script in the webhook — it's already generated but discarded. Audio is a different learning modality and some users will absorb it better than reading.

---

## 11. Navigation Still Tells the Wrong Story

**What's happening:** The sidebar has: Inbox, Library, Knowledge, Timeline, Profile, Arena, Icebox, Shipped, Killed, and now Skills is being added. For a user who sees Mira as "the place I master skills," half the nav is noise. Arena, Icebox, Shipped, Killed are idea-pipeline concepts. Inbox is generic.

**Suggestion:** Restructure for the mastery identity:
- **Primary**: Home, Skills (the map), Knowledge (the library), Profile
- **Secondary (collapsed or behind a toggle)**: Library (all experiences), Timeline
- **Tertiary (Cmd+K only)**: Inbox, Arena, Icebox, Shipped, Killed

The workspace doesn't need a nav entry — you enter it from Skills or Library. The drill flow doesn't need a nav entry — you enter it from captured ideas. The nav should answer "what is this product?" at a glance: **Home → Skills → Knowledge → Profile**.

---

## 12. User Agency in Shaping Their Learning

**What's happening:** The GPT creates goals, proposes domains, plans curricula, generates experiences. The user's agency is: accept & start, or don't. Inside an experience, they complete steps as designed. The multi-pass enrichment APIs exist (GPT can update/add/remove steps), but the user can't say "skip this, I already know it" or "make this harder" from within the app.

**Why it feels weird:** Mastery is deeply personal. The user knows things the system doesn't — "I already tried this approach last year" or "this is too basic for me." Without agency, the system feels imposed. With agency, it feels collaborative.

**Suggestion:** Lightweight user controls on steps:
- **"I know this"** button on lesson steps — marks it complete without reading, fires a skip event the GPT reads in re-entry. System adapts future content.
- **"Go deeper"** button on any completed step — queues a GPT enrichment pass to add follow-up content.
- **"Too hard / too easy"** signal on checkpoints (after grading) — feeds into friction analysis and lets the coach adjust.
- **Domain interest toggle** on the skill tree — "I want to focus on this domain" / "Deprioritize this domain." The GPT reads this in state and adjusts curriculum planning.

None of these require new backend infrastructure — they're interaction events that flow through the existing telemetry pipeline and get read by the GPT in re-entry.

---

## 13. The Rhythm Problem — No Sense of Sessions

**What's happening:** The app is always-available. You can do anything at any time. There's no concept of "today's session" or "this week's focus." Experiences have scheduled dates and estimated minutes, but the UI doesn't surface them as a session plan.

**Why it feels weird for mastery:** Mastery comes from deliberate practice in focused sessions, not from random browsing. The user opens the app and sees everything — all domains, all experiences, all knowledge. There's no guardrail that says "today, spend 30 minutes on these 2 steps."

**Suggestion:** A "Session" concept — lightweight, not a new entity. When the user opens the app, "Focus Today" could show: "Today's session (est. 25 min): Step 5 of Marketing Fundamentals, then Practice 2 retrieval questions on Content Distribution." Derived from: scheduled_date on steps, estimated_minutes, and which domains are closest to leveling up. The user can override ("I want to do something else"), but the default is a curated session. This makes the app feel like a coach with a plan, not a buffet.

---

## 14. MiraK's Content Builders Could Be Smarter with More Agents

**What's happening:** MiraK has 5 agents in a fixed pipeline. The strategist searches, 3 readers extract, 1 synthesizer writes. The playbook builder and audio script builder run after. Every research run produces the same shape of output.

**What would make it more effective:**
- **A "Gap Analyst" agent**: Given the user's current mastery level and existing knowledge units, identify what's *missing*. "User has foundation on content marketing but no tactical playbook for LinkedIn specifically." This focuses research on gaps rather than re-covering known ground.
- **A "Question Generator" agent**: Instead of MiraK producing only content, produce *questions* — retrieval questions, checkpoint questions, challenge prompts. These currently come from Genkit enrichment, but MiraK has the research context to produce better ones.
- **A "Difficulty Calibrator" agent**: Given the user's checkpoint scores and mastery levels, tag content sections with difficulty levels. "This section is appropriate for beginner → practicing. This section is practicing → proficient."
- **A "Connection Mapper" agent**: Finds cross-domain connections. "Your marketing research connects to your sales pipeline domain because attribution modeling requires understanding both." This powers the cross-pollination that the Genkit refine flow is supposed to do, but with research context.

These don't all need to ship at once. The gap analyst alone would dramatically improve research relevance on second and third passes.

---

## Summary: What to Prioritize

**Highest impact, lowest effort** (surface what already exists):
1. Skill domain cards show "what's needed for next level" (#1)
2. Coach surfaces after failed checkpoints (#6)
3. Mastery changes shown inline after checkpoints (#5)
4. Knowledge pre-step primers via step_knowledge_links (#3)

**High impact, medium effort** (new UX, existing data):
5. Focus Today with priority heuristic (#2)
6. Completion screen shows specific mastery changes (#7)
7. Session concept on home page (#13)
8. User agency buttons on steps (#12)

**High impact, higher effort** (new capabilities):
9. Domain fog-of-war / progressive revelation (#9)
10. MiraK depth control parameter (#10)
11. Nav restructure (#11)
12. Knowledge consumption phases (#4)
13. GPT session history in state packet (#8)
14. MiraK gap analyst agent (#14)

The core theme: **the intelligence is computed but not shown**. Most of these suggestions are about *surfacing* — letting the user see the growth the system is already tracking. The backend is ahead of the frontend. Close that gap and the app stops feeling like "a place I do assignments" and starts feeling like "a system that's helping me master something."

```

## MiraK Microservice (c:/mirak)

MiraK is a Python/FastAPI research agent on Cloud Run. Separate repo, integrated via webhooks.

### mirak/main.py

```python
# ==============================================================================
# MiraK v0.4 — Knowledge Generation Microservice (Scrape-First Pipeline)
# ==============================================================================
#
# PIPELINE (v0.4 — 3 logical stages):
# ------------------------------------
# 1. RESEARCH STRATEGIST — Searches the web across multiple angles, selects
#    the best 6-8 URLs, AND reads/scrapes those URLs to extract raw content.
#    Returns both the research plan and the scraped source content.
#
# 2. DEEP READERS (x3) — Pure analysis agents (NO search tools). They receive
#    the raw scraped content from the strategist and extract structured findings:
#    data points, tables, numbers, quotes, frameworks.
#    Much faster than v0.3 because they don't make any API calls.
#
# 3. FINAL SYNTHESIZER — Designs educational structure AND produces the final
#    reference-grade document in one pass.
#
# Total runner calls: 5 (1 strategist + 3 readers + 1 synthesizer)
# Expected runtime: 60-120 seconds (v0.3 was 224s, readers were 150s of that)
# ==============================================================================

import os
import time
import traceback
import uuid
import logging
import json

from dotenv import load_dotenv
load_dotenv('.env')

# ADK expects GOOGLE_API_KEY — map from our dedicated GEMINI_SEARCH key
import os
if os.environ.get('GEMINI_SEARCH') and not os.environ.get('GOOGLE_API_KEY'):
    os.environ['GOOGLE_API_KEY'] = os.environ['GEMINI_SEARCH']

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import requests
from pydantic import BaseModel
from typing import Optional, List

from google.adk.agents import LlmAgent
from google.adk.tools import agent_tool
from google.adk.tools.google_search_tool import GoogleSearchTool
from google.adk.tools import url_context

# ==============================================================================
# Logging
# ==============================================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("mirak")

# ==============================================================================
# FastAPI App
# ==============================================================================

app = FastAPI(
    title="MiraK — Knowledge Generation API",
    description="Deep research pipeline for comprehensive knowledge-base entries.",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# Request / Response Models
# ==============================================================================

class GenerateKnowledgeRequest(BaseModel):
    topic: str
    user_id: str = "default_user"
    session_id: Optional[str] = None
    category: Optional[str] = None
    experience_context: Optional[str] = None
    experience_id: Optional[str] = None  # If set, webhook will enrich this experience instead of creating a new one
    goal_id: Optional[str] = None  # If set, webhook will link knowledge to this goal


class KnowledgeResponse(BaseModel):
    status: str
    topic: str
    content: str
    raw_events: List[str]
    session_id: str
    timing: Optional[dict] = None


# ==============================================================================
# STAGE 1: RESEARCH STRATEGIST (searches + scrapes)
# ==============================================================================
# This agent does ALL the web work: searches across angles, evaluates results,
# AND reads the top URLs to extract raw content. This way the readers don't
# need search tools at all — they get pre-scraped content to analyze.
# ==============================================================================

strategist_search = LlmAgent(
    name='strategist_search',
    model='gemini-2.5-flash',
    description='Searches the web.',
    sub_agents=[],
    instruction='Use GoogleSearchTool to search the web. Return all results with URLs and snippets.',
    tools=[GoogleSearchTool()],
)

strategist_url = LlmAgent(
    name='strategist_url',
    model='gemini-2.5-flash',
    description='Reads URLs to extract their content.',
    sub_agents=[],
    instruction='Use UrlContextTool to read and extract the full content of URLs. Return as much content as possible.',
    tools=[url_context],
)

research_strategist = LlmAgent(
    name='research_strategist',
    model='gemini-2.5-flash',
    description='Plans research, executes searches, and scrapes top sources.',
    sub_agents=[],
    instruction='''You are an elite Research Strategist working for a growth engineering team. You do ALL the web work for the pipeline.

STEP 1: PLAN — Identify 5-7 advanced, technical research angles for the topic.
DO NOT search for beginner tutorials (e.g., "how to make short form videos").
INSTEAD, search for operator-level mechanics:
- Algorithmic factors, ranking signals, and feed mechanisms
- Advanced retention curves and pacing metrics
- Implementation workflows, batching logic, infrastructure
- Hard data, benchmarks (e.g., "YouTube Shorts engaged views methodology")
- Monetization and compliance mechanics

STEP 2: SEARCH — For each angle, run 1-2 highly specific search queries (5-10 total).
Use technical vocabulary in your queries (e.g., "retention curve methodology" instead of "how to get more watch time").

STEP 3: SELECT — Pick the top 6-8 URLs. Prioritize engineering blogs, platform documentation, technical teardowns, and hard data. Ignore generic SEO marketing blogs.

STEP 4: READ — Use the URL reading tool to scrape/read the URLs. Extract all highly granular, actionable content.

STEP 5: ORGANIZE — Package everything into 3 groups for deep readers:
- GROUP_1: Content about foundational mechanisms and models
- GROUP_2: Content about practical implementation, how-to guides, tools
- GROUP_3: Content about recent trends, statistics, platform updates

OUTPUT FORMAT:

## Research Results

### Key Questions to Answer
[5-8 questions the final document must address]

### GROUP 1 — Foundational (for Reader 1)
**Source: [URL 1]**
[Extracted content from this page — include ALL useful text, data, quotes]

**Source: [URL 2]**
[Extracted content]

### GROUP 2 — Practical (for Reader 2)
**Source: [URL 3]**
[Extracted content]

**Source: [URL 4]**
[Extracted content]

### GROUP 3 — Trends & Data (for Reader 3)
**Source: [URL 5]**
[Extracted content]

**Source: [URL 6]**
[Extracted content]

CRITICAL RULES:
- You MUST read/scrape the URLs, not just list them.
- Extract as much content as possible from each URL.
- The readers will ONLY see what you extract — they cannot access the web.
- Include specific numbers, dates, statistics, quotes from each source.
- If a URL is inaccessible, note it and use search snippet content instead.''',
    tools=[
        agent_tool.AgentTool(agent=strategist_search),
        agent_tool.AgentTool(agent=strategist_url),
    ],
)


# ==============================================================================
# STAGE 2: DEEP READERS (x3) — Pure analysis, NO search tools
# ==============================================================================
# These agents receive pre-scraped content and extract structured findings.
# No web access = fast (5-10s each vs 20-80s with search tools).
# ==============================================================================

def _make_deep_reader(reader_name: str):
    """Factory for pure-analysis reader agents (no search tools)."""
    return LlmAgent(
        name=reader_name,
        model='gemini-2.5-flash',
        description=f'Analyzes pre-scraped source content and extracts structured findings.',
        sub_agents=[],
        instruction=f'''You are {reader_name} — an elite technical reader extracting signal from noise.

You receive RAW SCRAPED CONTENT from web sources. You have NO web access.

Your job: Extract brutally concise, high-signal, operator-level mechanics. 
IGNORE all generic advice, throat-clearing, and beginner "SEO fluff".
If a source says "Use good lighting and a hook," IGNORE it.
If a source says "Hooks must be <2s and resolve a 3-second hold proxy," EXTRACT it.

FOCUS EXCLUSIVELY ON:
1. **Hard Data & Formulas**: Benchmarks, precise dates, statistical thresholds, algorithmic weighting.
2. **Mental Models & Workflows**: Specific sequential steps (e.g., "Hook → Value → Payoff").
3. **Platform Mechanics**: Specific UI constraints, discovery algorithms (e.g., "Swipe-based feed ranking").
4. **KPI Definitions**: How metrics are actually calculated (e.g., "Engaged views vs starts").
5. **Implementation Specifics**: Naming specific tools, constraints, frameworks, or legal checks.

OUTPUT FORMAT (KEEP UNDER 3000 CHARACTERS):
## Findings from {reader_name}

### Key Data Points (top 15-20)
- [specific data point with numbers/dates/source]
- [specific data point]
[Prioritize: numbers > frameworks > quotes > general observations]

### Comparison Data
[Any head-to-head comparisons found (platform vs platform, etc.)]

### Implementation Specifics
[Concrete settings, workflows, tools, parameters]

### Warnings
[Top 3-5 mistakes or gotchas with fixes]

Rules:
- Be SPECIFIC — include numbers, dates, percentages, names.
- Extract EVERYTHING useful. More is better at this stage.
- Note contradictions between sources explicitly.
- Do NOT write a final article — just extract structured findings.''',
        tools=[],  # NO tools — pure analysis
    )


deep_reader_1 = _make_deep_reader('deep_reader_1')
deep_reader_2 = _make_deep_reader('deep_reader_2')
deep_reader_3 = _make_deep_reader('deep_reader_3')


# ==============================================================================
# STAGE 3: FINAL SYNTHESIZER
# ==============================================================================

synth_search = LlmAgent(
    name='synth_search',
    model='gemini-2.5-flash',
    description='Supplementary searches for fact-checking.',
    sub_agents=[],
    instruction='Use GoogleSearchTool to verify specific claims or fill data gaps.',
    tools=[GoogleSearchTool()],
)

synth_url = LlmAgent(
    name='synth_url',
    model='gemini-2.5-flash',
    description='Reads URLs for fact-checking.',
    sub_agents=[],
    instruction='Use UrlContextTool to verify information from specific sources.',
    tools=[url_context],
)

final_synthesizer = LlmAgent(
    name='final_synthesizer',
    model='gemini-2.5-pro',
    description='Produces the final comprehensive knowledge-base document.',
    sub_agents=[],
    instruction='''You are an elite Growth Engineer and Technical Educator.
Your job is to synthesize raw research into a definitive, action-oriented knowledge asset.

Follow the exact structure defined in the entry below.
DO NOT use markdown tables. Tables are banned as they cause formatting issues. Use dense bulleted lists instead.

# [Specific, Professional Title]

## Executive summary
[3-4 sentences of extremely high-signal, tactical synthesis. Define the "real" objective—not the glossy one. Cite specific algorithmic/platform changes. NO FLUFF. NO "In today's fast-paced digital world..."]

## Definitions and mechanics
[Strict, operator-level definitions of formats, surfaces, or algorithms. Focus on HOW things work under the hood.]

### Algorithm ranking & platform comparison
[Detailed comparison using dense bulleted lists mapping platforms to their specific measurement criteria, max lengths, and ranking logic. NO TABLES.]

## Implementation workflows
[Concrete frameworks or mental models (e.g., "Hook -> Value -> Payoff -> Action").]
[Process diagram (mermaid flowchart) showing the exact pipeline/workflow.]

## Measurement and KPIs
[What to measure, mapped by funnel stage (Top/Mid/Bottom). How metrics are calculated.]
[KPIs mapped to platforms using dense bullet lists. NO TABLES.]

## 30-day implementation calendar
[Mermaid gantt and/or highly specific bulleted list showing batching, testing cadence, and exact tasks.]

## Compliance and risk constraints 
[Specific failure modes, legal issues (e.g., music rights, FTC disclosures).]

## Sources and Citations
[Cite the URLs provided by the readers as inline references or endnotes.]

---
Audience: Growth Engineering / Expert Operators
Estimated reading time: [X min]
---

CRITICAL RULES:
- BAN ALL FLUFF. Never use introductory filler. Never say "Crucially", "In conclusion", "As we navigate". 
- Write in a dense, analytical, matter-of-fact tone. 
- Prioritize mechanics and algorithms over soft skills.
- Use explicit terminology ("retention curves", "cold-start testing", "cohorts").
- MERMAID for processes is allowed, but NO tables. Use dense lists.
- Do NOT use tools. Just write the document.
''',
    tools=[],  # NO tools — pure writer
)


playbook_builder = LlmAgent(
    name='playbook_builder',
    model='gemini-2.5-flash',
    description='Produces a practical, tactical playbook from research findings.',
    sub_agents=[],
    instruction='''You are an elite Business Operator and Growth Strategist.
Take the comprehensive research provided and transform it into a "Tactical Playbook."

Your goal is to provide a step-by-step implementation guide that focuses on:
1.  **Profitability and Efficiency**: How to maximize returns and minimize costs/time.
2.  **Actionable Tactics**: Concrete, sequential steps an operator can take today.
3.  **Deliberate-Practice Micro-tasks**: Tiny, repeatable exercises to build mastery in the topic.

TONE: Brutally practical, technical, and executive. Use "operator language" (e.g., "batching", "LTV/CAC ratio", "SOPs").
Include specific revenue/cost estimates or benchmarks where available in the research.

OUTPUT FORMAT:
# [Topic] Playbook

## Tactical Overview
[One-paragraph executive summary of the implementation strategy.]

## Step-by-Step Implementation
[Numbered list of 5-7 clear, sequential stages.]

## Profitability Mechanics
[Bullet points on how this topic drives revenue or reduces costs. Include hard numbers if possible.]

## Deliberate Practice (Micro-tasks)
[3-5 small exercises the user can do daily to master this.]

Rules:
- NO FLUFF.
- Focus on EXECUTION.
- Use dense bulleted lists.
- NO TABLES.
''',
    tools=[],
)

audio_script_builder = LlmAgent(
    name='audio_script_builder',
    model='gemini-2.5-flash',
    description='Produces an audio script skeleton from research findings.',
    sub_agents=[],
    instruction='''You are an expert Audio Producer and Scriptwriter.
Take the comprehensive research provided and transform it into a 10-15 minute conversational audio script skeleton.

The script should sound like a smart friend or a senior operator explaining a complex topic to an equal.
It should be engaging, conversational, yet dense with insight.

OUTPUT FORMAT:
You MUST output your response as a valid JSON object with the following structure:
{
  "sections": [
    {
      "heading": "...",
      "narration": "...",
      "duration_estimate_seconds": 0
    }
  ]
}

Rules:
- Conversational tone.
- No "Today we are discussing..." intros.
- Break it into 4-6 meaningful sections.
- Ensure duration estimates are realistic.
- OUTPUT ONLY THE JSON.
''',
    tools=[],
)


webhook_packager = LlmAgent(
    name='webhook_packager',
    model='gemini-2.5-flash',
    description='Packages research metadata and experience proposals into the JSON.',
    sub_agents=[],
    instruction='''You are a system integrator. Your job is to extract metadata from research outputs and generate an experience proposal.

You will receive:
1. TOPIC (the original user topic)
2. FOUNDATION_CONTENT (from synthesizer)
3. PLAYBOOK_CONTENT (from playbook builder)

Your output MUST be a JSON object matching this schema exactly:
{
  "domain": "...",
  "foundation_metadata": {
    "title": "...",
    "thesis": "...",
    "key_ideas": ["...", "..."],
    "citations": [{"url": "...", "claim": "...", "confidence": 0.9}]
  },
  "playbook_metadata": {
    "title": "...",
    "thesis": "...",
    "key_ideas": ["...", "..."]
  },
  "experience_proposal": {
    "title": "...",
    "goal": "...",
    "template_id": "b0000000-0000-0000-0000-000000000002",
    "resolution": { "depth": "heavy", "mode": "build", "timeScope": "multi_day", "intensity": "medium" },
    "steps": [
      {
        "step_type": "lesson",
        "title": "Understanding [Topic]",
        "payload": { "sections": [{"heading": "...", "body": "...", "type": "text"}] }
      },
      {
        "step_type": "challenge",
        "title": "Apply [Topic]",
        "payload": { "objectives": [{"id": "obj1", "description": "...", "proof": "..."}] }
      },
      {
        "step_type": "reflection",
        "title": "What surprised you?",
        "payload": { "prompts": [{"id": "p1", "text": "...", "format": "free_text"}] }
      },
      {
        "step_type": "plan_builder",
        "title": "Build your action plan",
        "payload": { "sections": [{"type": "goals", "items": [{"id": "g1", "text": "..."}]}] }
      }
    ]
  }
}

CRITICAL RULES:
- The experience_proposal MUST be a 4-step Kolb-style chain: lesson -> challenge -> reflection -> plan_builder.
- Extract the 'thesis' (one-sentence summary) and 'key_ideas' (5-8 items) from the foundation and playbook text.
- The 'domain' should be a broad category like "SaaS Strategy", "Growth Marketing", "Content Engineering", etc.
- OUTPUT ONLY THE JSON. Do not output anything else.
''',
    tools=[],
)


# ==============================================================================
# Root agent (unused — pipeline is code-orchestrated)
# ==============================================================================

root_agent = LlmAgent(
    name='mirak_root',
    model='gemini-2.5-flash',
    description='Unused root agent — pipeline is code-orchestrated.',
    sub_agents=[],
    instruction='This agent is not used.',
    tools=[],
)


# ==============================================================================
# Pipeline Runner
# ==============================================================================

def run_agent_stage(agent, prompt_text: str, stage_name: str, user_id: str, session_id: str) -> str:
    """Run a single agent stage and extract the text output."""
    from google.adk import Runner
    import google.adk.sessions
    from google.genai.types import Content, Part

    stage_session_id = f"{session_id}_{stage_name}"
    stage_session_service = google.adk.sessions.InMemorySessionService()

    msg = Content(role="user", parts=[Part.from_text(text=prompt_text)])
    runner = Runner(
        app_name="mirak",
        agent=agent,
        session_service=stage_session_service,
        auto_create_session=True,
    )

    all_text = []
    event_count = 0
    tool_call_count = 0

    logger.info(f"[{stage_name}] 🚀 Starting agent run...")

    for event in runner.run(
        user_id=user_id,
        session_id=stage_session_id,
        new_message=msg,
    ):
        event_count += 1
        author = getattr(event, "author", "?")

        if hasattr(event, "content") and event.content is not None:
            if hasattr(event.content, "parts"):
                for part in event.content.parts:
                    if hasattr(part, "function_call") and part.function_call:
                        tool_call_count += 1
                        fn_name = getattr(part.function_call, "name", "unknown")
                        logger.info(f"[{stage_name}] 🔧 Tool call #{tool_call_count}: {fn_name} (by {author})")

                    if hasattr(part, "text") and part.text and len(part.text.strip()) > 0:
                        all_text.append(part.text)
                        preview = part.text[:100].replace('\n', ' ').strip()
                        logger.info(f"[{stage_name}] 📝 Text [{author}]: {len(part.text)} chars — {preview}...")

            elif hasattr(event.content, "text") and event.content.text:
                all_text.append(event.content.text)
                logger.info(f"[{stage_name}] 📝 Text [{author}]: {len(event.content.text)} chars")

    # Combine ALL text blocks (not just the longest) for complete output
    if all_text:
        # If there's one dominant block (>80% of total), use it; otherwise concat all
        total_chars = sum(len(t) for t in all_text)
        longest = max(all_text, key=len)
        if len(longest) > total_chars * 0.7:
            result = longest
        else:
            result = "\n\n".join(all_text)
        logger.info(f"[{stage_name}] ✅ Done — {event_count} events, {tool_call_count} tool calls, {len(result)} chars output")
        return result
    else:
        logger.warning(f"[{stage_name}] ⚠️ No text output! ({event_count} events, {tool_call_count} tool calls)")
        return f"[{stage_name} produced no output]"


# ==============================================================================
# API Endpoints
# ==============================================================================

@app.get("/health")
def health():
    return {"status": "ok", "service": "mirak", "version": "0.4.0"}


@app.post("/generate_knowledge")
def generate_knowledge(req: GenerateKnowledgeRequest, background_tasks: BackgroundTasks):
    """
    Generate a knowledge-base entry asynchronously via 3-stage pipeline.
    Immediately returns 202-like response to unblock the caller.
    """
    session_id = req.session_id or str(uuid.uuid4())
    logger.info(f"Accepted request for topic: {req.topic} | session: {session_id}")
    
    background_tasks.add_task(_background_knowledge_generation, req, session_id)
    
    return {
        "status": "accepted",
        "message": "Research started asynchronously",
        "topic": req.topic,
        "session_id": session_id
    }

def _background_knowledge_generation(req: GenerateKnowledgeRequest, session_id: str):
    pipeline_start = time.time()
    logger.info("=" * 60)
    logger.info(f"BACKGROUND GENERATION START: {req.topic}")
    logger.info("=" * 60)
    
    try:
        # 1. RESEARCH STRATEGIST
        logger.info(f"[PIPELINE] Running Research Strategist for: {req.topic}")
        strategist_output = run_agent_stage(
            research_strategist, 
            f"Perform deep research on the topic: {req.topic}. Extract technical mechanics, algorithms, and practical implementation details.", 
            "strategist", req.user_id, session_id
        )

        # 2. DEEP READERS
        logger.info("[PIPELINE] Running 3 Deep Readers for analysis...")
        reader_1_output = run_agent_stage(
            deep_reader_1, 
            f"Analyze the following research for foundational mechanisms and technical models:\n\n{strategist_output}", 
            "reader_1", req.user_id, session_id
        )
        reader_2_output = run_agent_stage(
            deep_reader_2, 
            f"Analyze the following research for practical implementation, how-to guides, and workflows:\n\n{strategist_output}", 
            "reader_2", req.user_id, session_id
        )
        reader_3_output = run_agent_stage(
            deep_reader_3, 
            f"Analyze the following research for recent trends, platform updates, and statistical benchmarks:\n\n{strategist_output}", 
            "reader_3", req.user_id, session_id
        )

        combined_findings = f"=== FOUNDATIONAL FINDINGS ===\n{reader_1_output}\n\n=== PRACTICAL FINDINGS ===\n{reader_2_output}\n\n=== TRENDS & DATA ===\n{reader_3_output}"

        # 3. FINAL SYNTHESIZER
        logger.info("[PIPELINE] Synthesizing final foundation document...")
        synth_output = run_agent_stage(
            final_synthesizer, 
            f"Synthesize the following findings into a definitive, action-oriented foundation knowledge unit for: {req.topic}\n\n{combined_findings}", 
            "synthesizer", req.user_id, session_id
        )

        # 4. PLAYBOOK BUILDER
        logger.info("[PIPELINE] Building practical playbook...")
        playbook_output = run_agent_stage(
            playbook_builder, 
            f"Create a tactical implementation playbook based on the following foundation research:\n\n{synth_output}", 
            "playbook", req.user_id, session_id
        )

        # 5. WEBHOOK PACKAGING (metadata only — full content injected programmatically)
        logger.info("[PIPELINE] Extracting metadata for webhook payload...")
        packager_prompt = f"""
ORIGINAL TOPIC: {req.topic}
FOUNDATION CONTENT:
{synth_output}

PLAYBOOK CONTENT:
{playbook_output}
"""
        final_json_str = run_agent_stage(
            webhook_packager, 
            packager_prompt, 
            "packager", req.user_id, session_id
        )

        # Cleanup JSON formatting
        clean_json = final_json_str.strip()
        if "```json" in clean_json:
            clean_json = clean_json.split("```json")[-1].split("```")[0].strip()
        elif "```" in clean_json:
            clean_json = clean_json.split("```")[-1].split("```")[0].strip()

        start_idx = clean_json.find('{')
        end_idx = clean_json.rfind('}')
        if start_idx != -1 and end_idx != -1:
            clean_json = clean_json[start_idx:end_idx+1]

        try:
            packager_data = json.loads(clean_json)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse packager JSON: {e}")
            logger.error(f"Raw string was: {clean_json[:500]}")
            packager_data = {}

        # Build payload — full content injected programmatically to prevent LLM truncation
        webhook_payload = {
            "topic": req.topic,
            "domain": packager_data.get("domain", "Strategic Initiative"),
            "session_id": session_id,
            "units": [
                {
                    "unit_type": "foundation",
                    "title": packager_data.get("foundation_metadata", {}).get("title", f"{req.topic} Foundation"),
                    "thesis": packager_data.get("foundation_metadata", {}).get("thesis", f"Foundation analysis of {req.topic}."),
                    "content": synth_output,
                    "key_ideas": packager_data.get("foundation_metadata", {}).get("key_ideas", []),
                    "citations": packager_data.get("foundation_metadata", {}).get("citations", [])
                },
                {
                    "unit_type": "playbook",
                    "title": packager_data.get("playbook_metadata", {}).get("title", f"{req.topic} Playbook"),
                    "thesis": packager_data.get("playbook_metadata", {}).get("thesis", f"Tactical playbook for {req.topic}."),
                    "content": playbook_output,
                    "key_ideas": packager_data.get("playbook_metadata", {}).get("key_ideas", [])
                }
            ],
            "experience_proposal": packager_data.get("experience_proposal", {}),
            "experience_id": req.experience_id,  # Pass through so Mira webhook can enrich this experience
            "goal_id": req.goal_id,  # Pass through to link knowledge to goal
        }

        duration = time.time() - pipeline_start
        logger.info(f"PIPELINE COMPLETE in {duration:.2f}s for: {req.topic}")
        
        # Webhook Routing: Local Primary, Vercel Fallback
        local_target = "https://mira.mytsapi.us"
        vercel_target = os.environ.get("VERCEL_WEBHOOK_URL", "https://mira-maddyup.vercel.app")
        
        target_webhook = f"{vercel_target}/api/webhook/mirak"
        local_up = False
        try:
            health_check = requests.get(f"{local_target}/api/dev/diagnostic", timeout=15)
            if health_check.status_code == 200:
                local_up = True
                target_webhook = f"{local_target}/api/webhook/mirak"
        except requests.RequestException:
            pass
            
        logger.info(f"Targeting webhook: {target_webhook} (Local up: {local_up})")
        
        secret = os.environ.get("MIRAK_WEBHOOK_SECRET", "")
        headers = {"x-mirak-secret": secret}
        
        resp = requests.post(target_webhook, json=webhook_payload, headers=headers, timeout=30)
        logger.info(f"Webhook delivered to {target_webhook}. Status: {resp.status_code}")
        if resp.status_code != 200:
            logger.error(f"Webhook error response: {resp.text}")
            
    except Exception as e:
        logger.error(f"Background task failed: {e}")
        traceback.print_exc()


# ==============================================================================
# Entry Point
# ==============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    logger.info(f"Starting MiraK v0.4 on port {port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

```

### mirak/Dockerfile

```
# ==============================================================================
# MiraK Dockerfile — Google Cloud Run
# ==============================================================================
# This container runs the FastAPI knowledge generation service.
# Cloud Run will set the PORT env var automatically.
# ==============================================================================

FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install dependencies first (for Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Cloud Run sets PORT env var; default to 8080 for Cloud Run convention
ENV PORT=8080

# Expose the port (informational for Cloud Run)
EXPOSE 8080

# Run the FastAPI app with uvicorn
# NOTE: Cloud Run requires listening on 0.0.0.0 and the PORT env var
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]

```

### mirak/requirements.txt

```
google-adk
fastapi
uvicorn[standard]
python-dotenv
google-genai
requests

```

### mirak/knowledge.md

```markdown
# Mira Knowledge Base - Agent Instructions

> **⚠️ THIS IS A WRITING QUALITY GUIDE — NOT A SCHEMA CONSTRAINT.**
> This document defines the *tone, structure, and quality bar* for human-authored knowledge base content.
> It is NOT meant to constrain the MiraK agent's raw research output format or the `knowledge_units` DB schema.
> MiraK's output shape is defined by `knowledge-validator.ts` in the Mira codebase and the webhook payload contract.
> Use this document for editorial guidance when reviewing or hand-writing KB content.

This document contains the core prompts and templates for the agent responsible for writing Mira Studio's knowledge-base entries. Use these to ensure consistency, clarity, and actionable content.

---

## 1. System / Task Prompt

Use this as the **system / task prompt** for the agent that writes your knowledge-base entries.

```text
You are an expert instructional writer designing knowledge-base content for a platform that teaches through executional experiences.

Your job is to create articles that help people:
1. find the answer fast,
2. understand it deeply enough to act,
3. retain it after reading,
4. connect the reading to a real executional experience.

Do not write like a marketer, essayist, or academic. Write like a sharp operator-teacher who respects the reader’s time.

GOAL

Create a knowledge-base entry that is:
- immediately useful for skimmers,
- clear for beginners,
- still valuable as a reference for advanced users,
- tightly connected to action, practice, and reflection.

PRIMARY WRITING RULES

1. Organize around a user job, not a broad topic.
Each article must answer one concrete question or support one concrete task.

2. Lead with utility.
The first screen must tell the reader:
- what this is,
- when to use it,
- the core takeaway,
- what to do next.

3. Front-load the answer.
Do not warm up. Do not add history first. Do not bury the key point.

4. Use plain language.
Prefer short sentences, concrete verbs, and familiar words.
Define jargon once, then use it consistently.

5. One paragraph = one idea.
Keep paragraphs short. Avoid walls of text.

6. Prefer examples before abstraction for beginner-facing material.
If a concept is important, show it in action before expanding theory.

7. Every concept must cash out into action.
For each major concept, explain:
- what to do,
- what to look for,
- what can go wrong,
- how to recover.

8. Support two reading modes.
Include:
- a guided, scaffolded explanation for less experienced readers,
- a concise decision-rule/reference layer for more advanced readers.

9. Build retrieval into the page.
End with recall/reflection prompts, not just “summary.”

10. No fluff.
Cut generic motivation, inflated adjectives, filler transitions, and empty encouragement.

VOICE AND STYLE

Write with this tone:
- clear
- practical
- intelligent
- grounded
- concise
- slightly punchy when useful

Do not sound:
- corporate
- academic
- mystical
- over-explanatory
- salesy
- “AI assistant”-ish

Never write phrases like:
- “In today’s fast-paced world…”
- “It is important to note that…”
- “This comprehensive guide…”
- “Let’s dive in”
- “In conclusion”

LEARNING DESIGN RULES

Your writing must help the learner move through:
- orientation,
- understanding,
- execution,
- reflection,
- retention.

For each article, include all of the following where relevant:

A. Orientation
Help the reader quickly decide whether this page is relevant.

B. Explanation
Explain the core idea simply and directly.

C. Worked example
Show one realistic example with enough detail to make the idea concrete.

D. Guided application
Give the reader a way to try the concept in a constrained, supported way.

E. Failure modes
List common mistakes, misreads, or traps.

F. Retrieval
Ask short questions that require recall, comparison, or explanation.

G. Transfer
Help the reader know when to apply this in a different but related context.

ARTICLE SHAPE

Produce the article in exactly this structure unless told otherwise:

# Title
Use an outcome-focused title. It should describe the job to be done.

## Use this when
2–4 bullets describing when this article is relevant.

## What you’ll get
2–4 bullets describing what the reader will be able to do or understand.

## Core idea
A short explanation in 2–5 paragraphs.
The first sentence must contain the main answer or rule.

## Worked example
Provide one realistic example.
Show:
- situation,
- action,
- reasoning,
- result,
- what to notice.

## Try it now
Give the reader a short guided exercise, prompt, or mini-task.

## Decision rules
Provide 3–7 crisp rules, heuristics, or if/then checks.

## Common mistakes
List 3–7 mistakes with a short correction for each.

## Reflection / retrieval
Provide 3–5 questions that require the reader to recall, explain, compare, or apply the idea.

## Related topics
List 3–5 related article ideas or next steps.

REQUIRED CONTENT CONSTRAINTS

- The article must be standalone.
- The article must solve one primary job only.
- The article must include at least one concrete example.
- The article must include at least one action step.
- The article must include at least one “what to watch for” cue.
- The article must include retrieval/reflection questions.
- The article must be skimmable from headings alone.
- The article must not assume prior knowledge unless prerequisites are explicitly stated.
- The article must not over-explain obvious points.

FORMAT RULES

- Use descriptive headings only.
- Use bullets for lists, rules, and mistakes.
- Use numbered steps only when sequence matters.
- Bold only key phrases, not full sentences.
- Do not use tables unless the content is clearly comparative.
- Do not use long intro paragraphs.
- Do not use giant nested bullet structures.
- Do not exceed the minimum length needed for clarity.

ADAPTIVE DIFFICULTY RULE

When the input suggests the reader is a beginner:
- define terms,
- slow down slightly,
- show more scaffolding,
- include a simpler example.

When the input suggests the reader is experienced:
- shorten explanations,
- emphasize distinctions and edge cases,
- prioritize heuristics and failure modes,
- avoid basic hand-holding.

OUTPUT METADATA

At the end, append this metadata block:

---
Audience: [Beginner / Intermediate / Advanced]
Primary job to be done: [one sentence]
Prerequisites: [short list or “None”]
Keywords: [5–10 tags]
Content type: [Concept / How-to / Diagnostic / Comparison / Reference]
Estimated reading time: [X min]
---

QUALITY BAR BEFORE FINALIZING

Before producing the final article, silently check:
1. Can a skimmer get the answer from the headings and first lines?
2. Is the core rule obvious in the first screen?
3. Does the article contain a real example rather than vague explanation?
4. Does it tell the reader what to do, not just what to know?
5. Are the decision rules crisp and memorable?
6. Are the mistakes realistic?
7. Do the retrieval questions require thinking rather than parroting?
8. Is there any fluff left to cut?
9. Would this still be useful as a reference after the first read?
10. Is every section earning its place?

If anything fails this check, fix it before returning the article.
```

---

## 2. Input Template

Use this **input template** whenever you want the agent to generate a page:

```text
Create a knowledge-base entry using the writing spec above.

Topic:
[insert topic]

Primary reader:
[beginner / intermediate / advanced / mixed]

User job to be done:
[what the person is trying to accomplish]

Executional experience this should support:
[describe the exercise, workflow, simulation, task, or experience]

Must include:
[list any required ideas, examples, terminology, edge cases]

Avoid:
[list anything you do not want emphasized]

Desired length:
[short / medium / long]
```

---

## 3. Review / Rewrite Prompt

This is the **review / rewrite prompt** for linting existing KB pages:

```text
Review the article below against this standard:
- skimmable,
- task-first,
- plain language,
- strong first screen,
- concrete example,
- decision rules,
- common mistakes,
- retrieval prompts,
- tied to action.

Return:
1. the top 5 problems,
2. what to cut,
3. what to rewrite,
4. missing sections,
5. a tightened replacement outline.

Do not praise weak writing. Be direct.
```

---

## 4. Design Guidelines

A strong next step is to make the agent emit content in **two layers** every time:

* **Quick Read** for scanners
* **Deep Read** for learners doing the full experience

That usually gives you a KB that works both as a training layer and as a reference layer.

I can also turn this into a **JSON schema / CMS content model** so your agent populates entries in a structured format instead of raw prose.

```

### mirak/mirak_gpt_action.yaml

```yaml
openapi: 3.1.0
info:
  title: MiraK Research API
  description: API for the MiraK research agent. Generate high-density knowledge units from a topic.
  version: 1.0.0
servers:
  - url: https://mirak-528663818350.us-central1.run.app
    description: MiraK Research Engine (Cloud Run)
paths:
  /generate_knowledge:
    post:
      operationId: generateKnowledge
      summary: Trigger deep research on a topic
      description: |
        Starts a multi-agent research pipeline on a given topic. 
        This is a fire-and-forget call that returns 202 Accepted immediately.
        The research agent will autonomously deliver results to the user's 
        Knowledge Tab via webhook when complete. Do not wait for response.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - topic
              properties:
                topic:
                  type: string
                  description: The research topic or question (e.g., "Next.js 14 App Router fundamentals")
                user_id:
                  type: string
                  default: "a0000000-0000-0000-0000-000000000001"
                session_id:
                  type: string
                  description: Optional ID to group multiple research runs into a single session.
                experience_id:
                  type: string
                  description: Optional. If provided, MiraK will enrich this existing experience with research results instead of creating a new one. Pass the experience ID that GPT created via POST /api/gpt/create.
      responses:
        '202':
          description: Research started (asynchronous)
          content:
            application/json:
              schema:
                type: object
                properties:
                  job_id:
                    type: string
                  message:
                    type: string
        '400':
          description: Invalid request
        '500':
          description: Server error

```

### mirak/README.md

```markdown
# MiraK — Knowledge Generation Microservice

> A standalone Python/FastAPI service that uses the Google ADK multi-agent pipeline to generate structured knowledge-base entries for **Mira Studio**.

## Why does this exist?

Mira Studio (Next.js, deployed on Vercel) can't run heavy Python workloads like the Google ADK agent framework. MiraK lives on **Google Cloud Run** as a separate service that Mira (and the Custom GPT) can call via HTTP.

## Architecture

```
┌─────────────────────┐          ┌──────────────────────┐
│  Custom GPT          │          │  Mira (Next.js)      │
│  (ChatGPT Action)    │          │  (Vercel)            │
└────────┬────────────┘          └──────────┬───────────┘
         │  POST /generate_knowledge         │  POST /generate_knowledge
         │                                   │
         ▼                                   ▼
┌────────────────────────────────────────────────────────┐
│  MiraK (FastAPI on Cloud Run)                          │
│                                                        │
│  root_agent → synth → [child_1, child_2, child_3]      │
│           ↓ GoogleSearch + URLContext tools             │
│                                                        │
│  Returns: Structured KB article (markdown)             │
│  Future:  Writes directly to Supabase                  │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│  Supabase (shared DB)                                  │
│  Table: knowledge_entries (future)                     │
│  - id, topic, category, content, user_id, created_at   │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│  Mira UI — Knowledge Tab (future)                      │
│  - Browse KB entries by category                       │
│  - Mark entries as "learned" / "practicing"             │
│  - Linked to but separate from Experiences             │
└────────────────────────────────────────────────────────┘
```

## Local Development

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set your Vertex / Gemini Search API key in .env
#    GOOGLE_API_KEY=<your key>

# 3. Run the server
python main.py
# → FastAPI running on http://localhost:8001

# 4. Test it
curl -X POST http://localhost:8001/generate_knowledge \
  -H "Content-Type: application/json" \
  -d '{"topic": "Next.js App Router fundamentals"}'
```

## Deploying to Cloud Run

This service is deployed via the Cloud Run MCP tool or the `gcloud` CLI:

```bash
gcloud run deploy mirak \
  --source . \
  --region us-central1 \
  --set-env-vars GOOGLE_API_KEY=<your-key>
```

Or via the MCP `deploy_local_folder` tool pointing at `c:\mirak`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_API_KEY` | ✅ | Vertex / Gemini Search API key (the "gemini_search" key) |
| `PORT` | Auto | Set by Cloud Run (default 8080) |
| `SUPABASE_URL` | Future | Supabase project URL for direct DB writes |
| `SUPABASE_SERVICE_KEY` | Future | Supabase service role key |

## Integration Notes

### For the Custom GPT
- A new **action** will be added to the Custom GPT's OpenAPI schema.
- The action will POST to the MiraK Cloud Run URL with a `topic` field.
- The GPT instructions will be updated to use this action when populating knowledge.

### For the Mira Knowledge Tab
- A new `knowledge_entries` table will be created in Supabase.
- MiraK will write to this table after generating an entry.
- The Mira frontend will read from this table to render the Knowledge Tab.
- Knowledge entries follow the format defined in `knowledge.md`.

### For the "roland" deployment
- When deploying to the production GCP project, the Cloud Run URL will change.
- The Custom GPT action URL and any Mira backend references must be updated.
- Supabase connection strings remain the same (shared DB).

## Files

| File | Purpose |
|---|---|
| `main.py` | FastAPI app + all ADK agent definitions |
| `knowledge.md` | The formatting rules the Synth agent enforces |
| `requirements.txt` | Python dependencies |
| `Dockerfile` | Cloud Run container definition |
| `.env` | Local environment variables (not committed) |
| `README.md` | This file |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/generate_knowledge` | Generate a KB entry for a topic |

```


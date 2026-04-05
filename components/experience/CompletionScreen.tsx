'use client';

import React, { useEffect, useState } from 'react';
import { SynthesisSnapshot } from '@/types/synthesis';
import { COPY } from '@/lib/studio-copy';
import Link from 'next/link';
import { ROUTES } from '@/lib/routes';
import { SkillDomain } from '@/types/skill';

interface CompletionScreenProps {
  experienceId: string;
  userId: string;
}

export default function CompletionScreen({ experienceId, userId }: CompletionScreenProps) {
  const [snapshot, setSnapshot] = useState<SynthesisSnapshot | null>(null);
  const [goalContext, setGoalContext] = useState<any>(null);
  const [skillDomains, setSkillDomains] = useState<SkillDomain[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [chainSuggestions, setChainSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingNext, setIsStartingNext] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [snapRes, goalRes, stepsRes] = await Promise.all([
          fetch(`/api/synthesis?sourceType=experience&sourceId=${experienceId}&userId=${userId}`),
          fetch(`/api/gpt/state?userId=${userId}`),
          fetch(`/api/experiences/${experienceId}/steps`)
        ]);

        if (snapRes.ok) {
          const snapData = await snapRes.json();
          if (isMounted) setSnapshot(snapData);
        }

        if (goalRes.ok) {
          const goalData = await goalRes.json();
          if (isMounted) setGoalContext(goalData);
          
          if (goalData.goal?.id) {
             const skillsRes = await fetch(`/api/skills?goalId=${goalData.goal.id}`);
             if (skillsRes.ok) {
                const skillsData = await skillsRes.json();
                if (isMounted) setSkillDomains(skillsData);
             }
          }
        }

        if (stepsRes.ok) {
           const stepsData = await stepsRes.json();
           if (isMounted) setSteps(stepsData);
        }

        const suggestionsRes = await fetch(`/api/experiences/${experienceId}/suggestions?userId=${userId}`);
        if (suggestionsRes.ok) {
           const suggestionsData = await suggestionsRes.json();
           if (isMounted) setChainSuggestions(suggestionsData);
        }
      } catch (err) {
        console.error('Failed to fetch completion data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    // Heuristic timeout to ensure we don't spin forever
    const timeout = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [experienceId, userId]);

  if (isLoading && !snapshot) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-6 animate-in fade-in duration-700">
        <div className="flex flex-col items-center justify-center space-y-6 py-12 text-center">
          <div className="w-16 h-16 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <div className="space-y-2">
            <h2 className="text-xl font-medium text-slate-200 italic">Synthesizing your journey...</h2>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">Mira is extracting insights and mapping your growth.</p>
          </div>
        </div>
        
        <div className="opacity-30 blur-sm pointer-events-none mt-8 grid grid-cols-1 md:grid-cols-12 gap-8">
           <div className="md:col-span-12 h-32 bg-slate-800/50 rounded-3xl animate-pulse" />
           <div className="md:col-span-12 lg:col-span-7 h-64 bg-slate-800/50 rounded-3xl animate-pulse" />
           <div className="md:col-span-12 lg:col-span-5 h-64 bg-slate-800/50 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Fallback values if no snapshot arrived after 3s
  const summary = snapshot?.summary || COPY.completion.body;
  const keySignals = snapshot?.key_signals || {};
  
  // Normalize signals
  let signals: string[] = [];
  if (Array.isArray(keySignals)) {
    signals = keySignals;
  } else if (typeof keySignals === 'object' && keySignals !== null) {
    signals = Object.keys(keySignals)
      .filter(k => k.startsWith('signal_'))
      .map(k => keySignals[k]);
      
    if (signals.length === 0) {
      if (keySignals.interactionCount) signals.push(`${keySignals.interactionCount} actions captured`);
    }
  }

  const getMasteryColor = (level: string) => {
    switch (level) {
      case 'expert': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'proficient': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'practicing': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'beginner': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'aware': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'undiscovered':
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const PREV_MAP: Record<string, string> = {
    expert: 'proficient',
    proficient: 'practicing',
    practicing: 'beginner',
    beginner: 'aware',
    aware: 'undiscovered'
  };

  const NEXT_THRESHOLD: Record<string, number> = {
    expert: 8, proficient: 8, practicing: 5, beginner: 3, aware: 1, undiscovered: 1
  };
  
  const NEXT_LEVEL: Record<string, string> = {
    expert: 'Max break', proficient: 'expert', practicing: 'proficient', beginner: 'practicing', aware: 'beginner', undiscovered: 'aware'
  };

  const masteryTransitions = (snapshot?.key_signals as any)?.masteryTransitions || [];
  
  // If no structured transitions, fall back to old logic for legacy support
  const movedDomains: any[] = [];
  const accumulatingDomains: any[] = [];
  
  if (masteryTransitions.length > 0) {
    masteryTransitions.forEach((t: any) => {
      if (t.isLevelUp) {
        movedDomains.push({
          name: t.domainName,
          previousLevel: t.before.level,
          masteryLevel: t.after.level
        });
      } else {
        accumulatingDomains.push({
          name: t.domainName,
          evidenceCount: t.after.evidence,
          nextThreshold: NEXT_THRESHOLD[t.after.level] || 0,
          nextLevelName: NEXT_LEVEL[t.after.level] || 'expert'
        });
      }
    });
  } else {
    // Legacy fallback (as a safety measure)
    skillDomains.forEach(domain => {
      if (domain.linkedExperienceIds?.includes(experienceId)) {
        const isLevelUp = 
          (domain.masteryLevel === 'expert' && domain.evidenceCount === 8) ||
          (domain.masteryLevel === 'proficient' && domain.evidenceCount === 5) ||
          (domain.masteryLevel === 'practicing' && domain.evidenceCount === 3) ||
          (domain.masteryLevel === 'beginner' && domain.evidenceCount === 1);

        if (isLevelUp) {
          movedDomains.push({
            ...domain,
            previousLevel: PREV_MAP[domain.masteryLevel] || 'undiscovered'
          });
        } else {
          accumulatingDomains.push({
            ...domain,
            nextThreshold: NEXT_THRESHOLD[domain.masteryLevel] || 0,
            nextLevelName: NEXT_LEVEL[domain.masteryLevel] || 'expert'
          });
        }
      }
    });
  }

  const stepCount = steps.length;
  const checkpointSteps = steps.filter(s => s.step_type === 'checkpoint' || s.type === 'checkpoint');
  const checkpointsPassed = checkpointSteps.filter(s => s.status === 'completed').length;
  const draftCount = (snapshot?.key_signals as any)?.draftCount || 0;

  const facets = snapshot?.facets || [];
  const nextCandidates = snapshot?.next_candidates || [];

  const activeGoal = goalContext?.goal;
  const proficientCount = skillDomains.filter((d: any) => 
    ['proficient', 'expert'].includes(d.masteryLevel)
  ).length;

  const handleStartNext = async (suggestion: any) => {
    setIsStartingNext(suggestion.templateClass);
    try {
      const res = await fetch('/api/gpt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'experience',
          payload: {
            template_id: suggestion.templateId || suggestion.templateClass,
            user_id: userId,
            title: suggestion.title || `Follow-up: ${suggestion.templateClass}`,
            goal: suggestion.reason || '',
            instance_type: 'persistent',
            status: 'proposed',
            resolution: suggestion.resolution || { depth: 'medium', mode: 'guided', timeScope: 'session', intensity: 'moderate' },
            previous_experience_id: experienceId,
            reentry: null,
            next_suggested_ids: [],
            friction_level: null,
          }
        })
      });

      if (res.ok) {
        // Redirect to library to see the newly proposed experience
        window.location.href = ROUTES.library;
      } else {
        const errData = await res.json();
        console.error('Failed to create next experience:', errData.error);
        setIsStartingNext(null);
      }
    } catch (err) {
      console.error('Failed to start next experience:', err);
      setIsStartingNext(null);
    }
  };

  const getClassIcon = (templateClass: string) => {
    switch (templateClass) {
      case 'questionnaire': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
      case 'lesson': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>;
      case 'challenge': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>;
      case 'plan_builder': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>;
      case 'reflection': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>;
      case 'essay_tasks': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>;
      default: return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6 animate-in zoom-in-95 duration-700">
      {/* Header Narrative */}
      <header className="mb-16 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Mira's Observation
        </div>
        <h1 className="text-5xl font-black text-white mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
          Goal Crystalized.
        </h1>
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <p className="relative text-xl text-slate-300 leading-relaxed font-serif italic py-4 px-6 bg-slate-950/20 rounded-2xl border border-white/5">
            "{summary}"
          </p>
        </div>
      </header>

      {/* Level Up Celebration */}
      {movedDomains.length > 0 && (
        <div className="mb-16 animate-in zoom-in duration-1000 delay-500 fill-mode-both">
          <div className="p-1 rounded-[2.5rem] bg-gradient-to-r from-yellow-500/40 via-amber-500/40 to-orange-500/40 shadow-2xl shadow-amber-500/10">
            <div className="bg-[#0a0a12] rounded-[2.25rem] p-8 text-center relative overflow-hidden">
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px]" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px]" />
              
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-6 shadow-inner">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              
              <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-400 mb-2 uppercase tracking-tighter">
                Level Up
              </h3>
              <p className="text-slate-400 text-sm mb-8 font-medium">
                Your expertise in {movedDomains.map(d => d.name.replace(/-/g, ' ')).join(' & ')} has reached a new threshold.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4">
                {movedDomains.map((d, i) => (
                  <div key={i} className="flex items-center gap-4 bg-slate-950/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-amber-500/20 shadow-xl">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-widest">{d.previousLevel}</div>
                    <svg className="w-4 h-4 text-amber-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                    <div className="text-sm font-black text-amber-400 uppercase tracking-widest">{d.masteryLevel}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
        {/* Left Column: Progress & Proof */}
        <div className="md:col-span-12 lg:col-span-12 space-y-8">
          {activeGoal && (
            <section className="bg-indigo-500/5 border border-indigo-500/20 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <span className="text-8xl italic font-black">⌬</span>
              </div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Goal Trajectory</div>
                  <h3 className="text-2xl font-black text-white italic tracking-tight">{activeGoal.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-indigo-300/70 font-medium">
                    <span>{proficientCount} of {skillDomains.length} domains reached Proficiency</span>
                    <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
                         style={{ width: `${(proficientCount / (skillDomains.length || 1)) * 100}%` }} 
                       />
                    </div>
                  </div>
                </div>
                <Link 
                  href={ROUTES.skills}
                  className="px-6 py-3 bg-[#0d0d18] border border-indigo-500/30 text-indigo-400 text-sm font-bold rounded-2xl hover:bg-indigo-500/10 transition-all text-center"
                >
                  View Skill Tree
                </Link>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Key Observed Signals */}
             <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 backdrop-blur-sm">
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                 </div>
                 <h3 className="text-lg font-bold text-slate-200">Key Observed Signals</h3>
               </div>
               <div className="flex flex-wrap gap-3">
                 {signals.length > 0 ? signals.map((sig, i) => (
                   <div key={i} className="px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-300 text-sm font-medium hover:scale-105 transition-transform">
                     {sig}
                   </div>
                 )) : (
                   <span className="text-slate-500 italic text-sm">Mapping behavioral patterns...</span>
                 )}
               </div>
               {keySignals?.frictionAssessment && (
                 <div className="mt-8 pt-8 border-t border-slate-800/50">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Friction Assessment</div>
                    <p className="text-slate-300 leading-relaxed font-medium italic">
                      "{keySignals.frictionAssessment}"
                    </p>
                 </div>
               )}
             </section>

             {/* Growth Indicators (Facets) */}
             <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 backdrop-blur-sm">
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                 </div>
                 <h3 className="text-lg font-bold text-slate-200">Growth Indicators</h3>
               </div>
               <div className="space-y-4">
                  {facets.length > 0 ? facets.map((facet: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5 group hover:border-emerald-500/20 transition-all">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight mb-1">{facet.facet_type.replace('_', ' ')}</span>
                        <span className="text-slate-200 font-medium text-sm">{facet.value}</span>
                      </div>
                      <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-1000" 
                           style={{ width: `${(facet.confidence || 0) * 100}%` }} 
                         />
                      </div>
                    </div>
                  )) : (
                    <span className="text-slate-500 italic text-sm">Your profile is evolving...</span>
                  )}
               </div>
             </section>
          </div>

          {/* Mastery Shifts & Proof */}
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Evidence Log</div>
              <div className="flex gap-4">
                 <div className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">
                   {stepCount} STEPS COMPLETE
                 </div>
                 {checkpointSteps.length > 0 && (
                   <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                     {checkpointsPassed}/{checkpointSteps.length} CHECKPOINTS
                   </div>
                 )}
              </div>
            </div>
            
            <div className="space-y-4">
              {accumulatingDomains.length > 0 ? accumulatingDomains.map((domain, i) => (
                <div key={`accum-${i}`} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 group">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium capitalize">{domain.name.replace(/-/g, ' ')}</span>
                    <span className="text-[10px] text-slate-500">Toward {domain.nextLevelName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 group-hover:scale-110 transition-transform">
                      <span className="text-indigo-400 font-black text-lg">{domain.evidenceCount}</span>
                      <span className="text-slate-600 text-xs font-bold">/ {domain.nextThreshold}</span>
                    </div>
                    <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-indigo-500" 
                         style={{ width: `${(domain.evidenceCount / (domain.nextThreshold || 1)) * 100}%` }} 
                       />
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-slate-500 italic text-sm text-center py-4">Knowledge domains are recalibrating.</div>
              )}
            </div>
          </section>
        </div>

        {/* What's Next? (Now taking a larger role) */}
        <div className="md:col-span-12 space-y-8 mt-8">
          <div className="flex items-center gap-3 mb-4 px-2">
            <span className="text-xs font-black text-[#475569] uppercase tracking-[0.2em]">Logical Next Conversions</span>
            <span className="flex-grow h-px bg-[#1e1e2e]" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nextCandidates.slice(0, 3).map((cad, i) => {
              const [classPart, ...rest] = cad.split(':');
              const title = rest.join(':').trim() || cad;
              const templateClass = classPart.toLowerCase().trim();
              const isValidClass = ['questionnaire', 'lesson', 'challenge', 'plan_builder', 'reflection', 'essay_tasks'].includes(templateClass);
              
              return (
                <div key={i} className="group p-6 rounded-3xl bg-indigo-600/5 border border-indigo-500/10 hover:border-indigo-500/40 transition-all flex flex-col gap-4 relative overflow-hidden backdrop-blur-md">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                      {getClassIcon(isValidClass ? templateClass : 'default')}
                    </div>
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded">
                      {isValidClass ? (COPY.workspace.stepTypes as any)[templateClass] || templateClass : 'Recommendation'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-bold leading-tight group-hover:text-indigo-200 transition-colors">
                      {title}
                    </p>
                    <div className="text-[10px] text-slate-500 italic block">
                      Generated by Mira based on your recent context.
                    </div>
                  </div>
                  <Link 
                    href={ROUTES.send}
                    className="mt-2 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-center text-xs font-black transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                  >
                    Start Experience →
                  </Link>
                </div>
              );
            })}

            {chainSuggestions.slice(0, 3).map((suggestion, i) => (
              <div key={`chain-${i}`} className="group p-6 rounded-3xl bg-violet-600/5 border border-violet-500/10 hover:border-violet-500/40 transition-all flex flex-col gap-4 relative overflow-hidden backdrop-blur-md">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all" />
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20 group-hover:scale-110 transition-transform">
                    {getClassIcon(suggestion.templateClass)}
                  </div>
                  <div className="text-[10px] font-black text-violet-400 uppercase tracking-widest bg-violet-500/10 px-2 py-1 rounded">
                    Chain Linked
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-white font-bold leading-tight group-hover:text-violet-200 transition-colors">
                    {suggestion.templateClass.charAt(0).toUpperCase() + suggestion.templateClass.slice(1).replace('_', ' ')}
                  </p>
                  <div className="text-[10px] text-slate-500 italic line-clamp-1 block">
                    "{suggestion.reason}"
                  </div>
                </div>
                <button
                  onClick={() => handleStartNext(suggestion)}
                  disabled={!!isStartingNext}
                  className="mt-2 w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-center text-xs font-black transition-all shadow-lg shadow-violet-600/20 active:scale-95 disabled:opacity-50"
                >
                  {isStartingNext === suggestion.templateClass ? 'Preparing...' : 'Continue Journey →'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-12 border-t border-white/5 mt-12 bg-slate-950/20 rounded-b-[3rem]">
        <Link 
          href={ROUTES.library}
          className="text-xs font-black text-slate-500 hover:text-white transition-all uppercase tracking-[0.2em] flex items-center gap-2 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Library
        </Link>
        <Link 
          href={ROUTES.send}
          className="px-12 py-4 bg-white text-black rounded-full font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all shadow-2xl shadow-indigo-500/10 active:scale-95"
        >
          Define Next Idea
        </Link>
      </div>
    </div>
  );
}


'use client';

import React, { useEffect, useState } from 'react';
import { SynthesisSnapshot } from '@/types/synthesis';
import { COPY } from '@/lib/studio-copy';
import Link from 'next/link';
import { ROUTES } from '@/lib/routes';

interface CompletionScreenProps {
  experienceId: string;
  userId: string;
}

export default function CompletionScreen({ experienceId, userId }: CompletionScreenProps) {
  const [snapshot, setSnapshot] = useState<SynthesisSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchSnapshot = async () => {
      try {
        const response = await fetch(`/api/synthesis?sourceType=experience&sourceId=${experienceId}&userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted) setSnapshot(data);
        }
      } catch (err) {
        console.error('Failed to fetch synthesis:', err);
      }
    };

    fetchSnapshot();

    const timeout = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [experienceId, userId]);

  if (isLoading && !snapshot) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 py-24 text-center animate-in fade-in duration-700">
        <div className="w-16 h-16 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <div className="space-y-2">
          <h2 className="text-xl font-medium text-slate-200 italic">Synthesizing your journey...</h2>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">Mira is extracting insights and mapping your growth.</p>
        </div>
      </div>
    );
  }

  // Fallback values if no snapshot arrived after 3s
  const summary = snapshot?.summary || COPY.completion.body;
  const keySignals = snapshot?.key_signals || {};
  
  // Normalize signals from different possible snapshot shapes
  let signals: string[] = [];
  if (Array.isArray(keySignals)) {
    signals = keySignals;
  } else if (typeof keySignals === 'object' && keySignals !== null) {
    // Check if it's the reduction from synthesis-service
    signals = Object.keys(keySignals)
      .filter(k => k.startsWith('signal_'))
      .map(k => keySignals[k]);
      
    // If no signal_ keys, check for other properties we can use
    if (signals.length === 0) {
      if (keySignals.interactionCount) signals.push(`${keySignals.interactionCount} actions captured`);
    }
  }

  const facets = snapshot?.facets || [];
  const nextCandidates = snapshot?.next_candidates || [];

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6 animate-in zoom-in-95 duration-700">
      <div className="flex flex-col items-center text-center mb-16">
        <div className="relative mb-6">
           <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
           <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
              <svg className="w-12 h-12 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
           </div>
        </div>
        <h1 className="text-5xl font-black text-white mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
          {COPY.completion.heading}
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl leading-relaxed font-light italic">
          "{summary}"
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16 text-left">
        {/* Signals & Key Findings */}
        <div className="md:col-span-12 lg:col-span-7 space-y-8">
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
                 <span className="text-slate-500 italic text-sm">No specific behavioral signals detected.</span>
               )}
             </div>
             
             {keySignals?.frictionAssessment && (
               <div className="mt-8 pt-8 border-t border-slate-800/50">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Friction Level</div>
                  <p className="text-slate-300 leading-relaxed font-medium capitalize">
                    {keySignals.frictionAssessment}
                  </p>
               </div>
             )}
           </section>
        </div>

        {/* Growth & Next Steps */}
        <div className="md:col-span-12 lg:col-span-5 space-y-8">
           <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 backdrop-blur-sm">
             <div className="flex items-center gap-3 mb-6">
               <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
               </div>
               <h3 className="text-lg font-bold text-slate-200">Growth Indicators</h3>
             </div>
             <div className="space-y-4">
                {facets.length > 0 ? facets.map((facet, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight mb-1">{facet.facet_type.replace('_', ' ')}</span>
                      <span className="text-slate-200 font-medium text-sm">{facet.value}</span>
                    </div>
                    <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" style={{ width: `${facet.confidence * 100}%` }} />
                    </div>
                  </div>
                )) : (
                  <span className="text-slate-500 italic text-sm">Your profile is evolving...</span>
                )}
             </div>
           </section>

           <section className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-8 backdrop-blur-sm">
             <h3 className="text-lg font-bold text-indigo-300 mb-6 flex items-center gap-2">
               Next Suggested Paths
             </h3>
             <ul className="space-y-4">
               {nextCandidates.length > 0 ? nextCandidates.map((cad, i) => (
                 <li key={i} className="text-slate-400 text-sm leading-relaxed pl-4 border-l-2 border-indigo-500/30">
                   {cad}
                 </li>
               )) : (
                 <li className="text-slate-500 italic text-sm">Mira is calculating your next move.</li>
               )}
             </ul>
           </section>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-8">
        <Link 
          href={ROUTES.library}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-950 font-bold hover:bg-slate-200 transition-all text-center shadow-xl shadow-white/5"
        >
          {COPY.library.heading}
        </Link>
        <div className="text-slate-500 text-sm font-medium font-mono uppercase tracking-widest px-4">OR</div>
        <Link 
           href={ROUTES.home}
           className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 text-white font-bold border border-slate-700 hover:border-slate-500 transition-all text-center"
        >
           Return to Cockpit
        </Link>
      </div>
    </div>
  );
}

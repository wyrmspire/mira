'use client';

import React from 'react';
import { CurriculumOutline } from '@/types/curriculum';
import TrackCard from './TrackCard';
import { COPY } from '@/lib/studio-copy';

interface TrackSectionProps {
  outlines: CurriculumOutline[];
}

export default function TrackSection({ outlines }: TrackSectionProps) {
  if (outlines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-indigo-500/5 rounded-3xl border border-dashed border-indigo-500/20 text-center mb-16">
        <span className="text-4xl mb-4">🗺️</span>
        <h2 className="text-lg font-bold text-[#f1f5f9] mb-2">{COPY.library.tracksSection}</h2>
        <p className="text-sm text-[#94a3b8] max-w-xs">{COPY.library.emptyTracks}</p>
      </div>
    );
  }

  return (
    <section className="mb-20">
      <div className="flex items-center gap-4 mb-10 overflow-hidden">
        <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest whitespace-nowrap">
          {COPY.library.tracksSection}
        </h2>
        <div className="h-px w-full bg-[#1e1e2e]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {outlines.map((outline) => (
          <TrackCard key={outline.id} outline={outline} />
        ))}
      </div>
    </section>
  );
}

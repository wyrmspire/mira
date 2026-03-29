'use client';

import React from 'react';
import SkillTreeCard, { GridSkillDomain } from './SkillTreeCard';

interface SkillTreeGridProps {
  domains: GridSkillDomain[];
}

export default function SkillTreeGrid({ domains }: SkillTreeGridProps) {
  if (domains.length === 0) {
    return (
      <div className="py-12 px-6 border border-dashed border-[#1e1e2e] rounded-3xl text-center bg-[#0d0d18]/30">
        <span className="text-sm font-medium text-[#4a4a6a]">No skill domains discovered yet.</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {domains.map((domain) => (
        <SkillTreeCard key={domain.id} domain={domain} />
      ))}
    </div>
  );
}

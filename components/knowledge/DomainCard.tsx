'use client';

import React from 'react';

interface DomainCardProps {
  domain: string;
  unitCount: number;
  readCount: number;
  onClick?: () => void;
}

export default function DomainCard({ domain, unitCount, readCount, onClick }: DomainCardProps) {
  const progress = Math.round((readCount / unitCount) * 100);

  return (
    <div 
      onClick={onClick}
      className="flex flex-col p-5 bg-[#0d0d18] border border-[#1e1e2e] rounded-2xl hover:border-indigo-500/30 transition-all group cursor-pointer shadow-sm hover:shadow-indigo-500/5"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold text-[#f1f5f9] capitalize group-hover:text-indigo-300 transition-colors">
          {domain.replace(/-/g, ' ')}
        </h3>
        <div className="px-2 py-0.5 rounded bg-[#1e1e2e] text-[#94a3b8] text-[10px] font-bold uppercase tracking-tight border border-[#33334d]">
          {unitCount} {unitCount === 1 ? 'Unit' : 'Units'}
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a6a]">
            Progress
          </span>
          <span className="text-[10px] font-mono text-indigo-400">
            {progress}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-[#1e1e2e] rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

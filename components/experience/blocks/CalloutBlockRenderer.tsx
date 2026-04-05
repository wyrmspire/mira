'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { CalloutBlock } from '@/types/experience';
import { cn } from '@/lib/utils';

interface CalloutBlockRendererProps {
  block: CalloutBlock;
  className?: string;
}

const INTENT_MAP = {
  info: {
    icon: 'ℹ',
    label: 'Information',
    styles: "bg-blue-500/5 border-l-4 border-blue-500 rounded-r-2xl shadow-[0_0_30px_rgba(59,130,246,0.05)]",
    textStyles: "text-blue-100",
    labelStyles: "text-blue-300"
  },
  warning: {
    icon: '⚠',
    label: 'Attention',
    styles: "bg-amber-500/5 border-l-4 border-amber-500 rounded-r-2xl shadow-[0_0_30px_rgba(245,158,11,0.05)]",
    textStyles: "text-amber-100",
    labelStyles: "text-amber-300"
  },
  tip: {
    icon: '⚡',
    label: 'Key Insight',
    styles: "bg-indigo-500/5 border-l-4 border-indigo-500 rounded-r-2xl shadow-[0_0_30px_rgba(99,102,241,0.05)]",
    textStyles: "text-indigo-100",
    labelStyles: "text-indigo-300"
  },
  success: {
    icon: '✔',
    label: 'Achievement',
    styles: "bg-emerald-500/5 border-l-4 border-emerald-500 rounded-r-2xl shadow-[0_0_30px_rgba(16,185,129,0.05)]",
    textStyles: "text-emerald-100",
    labelStyles: "text-emerald-300"
  }
};

/**
 * Styled callout with unicode icons for info, warning, tip, success.
 * Supports Markdown content within the label.
 */
export default function CalloutBlockRenderer({ block, className }: CalloutBlockRendererProps) {
  const config = INTENT_MAP[block.intent] || INTENT_MAP.info;

  return (
    <div className={cn(
      "p-8 transition-all duration-300",
      config.styles,
      className
    )}>
      <div className="flex items-center gap-2 mb-4">
        <span className={cn("text-lg", config.labelStyles)}>{config.icon}</span>
        <h3 className={cn("font-bold uppercase tracking-wider text-xs", config.labelStyles)}>
          {config.label}
        </h3>
      </div>

      <div className={cn(
        "prose prose-invert max-w-none prose-p:my-0 prose-p:leading-relaxed prose-p:text-xl prose-p:font-medium prose-strong:text-studio-white prose-code:text-amber-300",
        config.textStyles
      )}>
        <ReactMarkdown>{block.content}</ReactMarkdown>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ContentBlock } from '@/types/experience';
import { cn } from '@/lib/utils';

interface ContentBlockRendererProps {
  block: ContentBlock;
  className?: string;
}

/**
 * Standard Markdown content block. Use ReactMarkdown with prose styling.
 */
export default function ContentBlockRenderer({ block, className }: ContentBlockRendererProps) {
  return (
    <div className={cn(
      "prose prose-invert max-w-none prose-sm sm:prose-base",
      "prose-headings:text-studio-title prose-p:text-studio-text prose-a:text-studio-accent",
      "prose-strong:text-studio-white prose-code:text-yellow-400 prose-pre:bg-studio-black/20",
      className
    )}>
      <ReactMarkdown>{block.content}</ReactMarkdown>
    </div>
  );
}

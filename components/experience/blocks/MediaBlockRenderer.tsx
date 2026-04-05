'use client';

import React from 'react';
import { MediaBlock } from '@/types/experience';
import { cn } from '@/lib/utils';

interface MediaBlockRendererProps {
  block: MediaBlock;
  className?: string;
}

/**
 * Media block supporting image, video, and audio.
 */
export default function MediaBlockRenderer({ block, className }: MediaBlockRendererProps) {
  const { media_type, url, caption } = block;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative rounded-2xl overflow-hidden bg-studio-card border border-studio-border/50 group">
        {media_type === 'image' && (
          <img 
            src={url} 
            alt={caption || 'Media content'} 
            className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}

        {media_type === 'video' && (
          <video 
            src={url} 
            controls 
            className="w-full aspect-video bg-black"
          />
        )}

        {media_type === 'audio' && (
          <div className="p-6 flex items-center justify-center bg-studio-black/40">
            <audio src={url} controls className="w-full max-w-md" />
          </div>
        )}
        
        {/* Glass overlay for styling */}
        <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-2xl" />
      </div>

      {caption && (
        <p className="text-xs text-center text-studio-muted italic font-medium px-4">
          {caption}
        </p>
      )}
    </div>
  );
}

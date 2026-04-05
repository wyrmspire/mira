'use client';

import React from 'react';
import { ExperienceBlock } from '@/types/experience';
import ContentBlockRenderer from './ContentBlockRenderer';
import CalloutBlockRenderer from './CalloutBlockRenderer';
import MediaBlockRenderer from './MediaBlockRenderer';
import PredictionBlockRenderer from './PredictionBlockRenderer';
import ExerciseBlockRenderer from './ExerciseBlockRenderer';
import CheckpointBlockRenderer from './CheckpointBlockRenderer';
import HintLadderBlockRenderer from './HintLadderBlockRenderer';

interface BlockRendererProps {
  block: ExperienceBlock;
  instanceId?: string;
  stepId?: string;
  className?: string;
}

/**
 * Master BlockRenderer that routes an ExperienceBlock based on its type
 * to the specialized renderer component. Updated in Lane 3 to include
 * interactive prediction and exercise renderers.
 */
export default function BlockRenderer({ block, instanceId, stepId, className }: BlockRendererProps) {
  switch (block.type) {
    case 'content':
      return <ContentBlockRenderer block={block} className={className} />;
    
    case 'callout':
      return <CalloutBlockRenderer block={block} className={className} />;
    
    case 'media':
      return <MediaBlockRenderer block={block} className={className} />;

    case 'prediction':
      return (
        <PredictionBlockRenderer 
          block={block} 
          instanceId={instanceId} 
          stepId={stepId} 
          className={className} 
        />
      );

    case 'exercise':
      return (
        <ExerciseBlockRenderer 
          block={block} 
          instanceId={instanceId} 
          stepId={stepId} 
          className={className} 
        />
      );

    case 'checkpoint':
      return (
        <CheckpointBlockRenderer 
          block={block} 
          instanceId={instanceId} 
          stepId={stepId} 
          className={className} 
        />
      );

    case 'hint_ladder':
      return (
        <HintLadderBlockRenderer 
          block={block} 
          instanceId={instanceId} 
          stepId={stepId} 
          className={className} 
        />
      );

    default:
      return (
        <div className="text-studio-danger text-xs p-2">
          Unknown block type: {(block as any).type}
        </div>
      );
  }
}

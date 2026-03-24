'use client';

import React from 'react';
import ExperienceRenderer from '@/components/experience/ExperienceRenderer';
import type { ExperienceInstance, ExperienceStep } from '@/types/experience';

interface WorkspaceClientProps {
  instance: ExperienceInstance;
  steps: ExperienceStep[];
}

export default function WorkspaceClient({ instance, steps }: WorkspaceClientProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <ExperienceRenderer 
        instance={instance} 
        steps={steps} 
      />
    </div>
  );
}

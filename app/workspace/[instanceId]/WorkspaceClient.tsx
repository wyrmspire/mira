'use client';

import React from 'react';
import ExperienceRenderer from '@/components/experience/ExperienceRenderer';

// TODO: Reconciliation with Lane 2 (types/experience.ts)
interface Resolution {
  depth: 'light' | 'medium' | 'heavy';
  mode: string;
  timeScope: string;
  intensity: string;
}

interface ExperienceInstance {
  id: string;
  title: string;
  goal: string;
  status: string;
  resolution: Resolution;
}

interface ExperienceStep {
  id: string;
  instance_id: string;
  step_order: number;
  step_type: string;
  title: string;
  payload: any;
  completion_rule?: string;
}

interface WorkspaceClientProps {
  instance: any; // Using any for now then casting to local types to avoid Lane 2 mismatch
  steps: any[];
}

export default function WorkspaceClient({ instance, steps }: WorkspaceClientProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <ExperienceRenderer 
        instance={instance as ExperienceInstance} 
        steps={steps as ExperienceStep[]} 
      />
    </div>
  );
}

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useDraftPersistence, type DraftContext } from '@/lib/hooks/useDraftPersistence';

const DraftContext = createContext<DraftContext | null>(null);

export function useDraft() {
  const context = useContext(DraftContext);
  if (!context) {
    throw new Error('useDraft must be used within a DraftProvider');
  }
  return context;
}

interface DraftProviderProps {
  instanceId: string;
  children: ReactNode;
}

export function DraftProvider({ instanceId, children }: DraftProviderProps) {
  const draftContextValue = useDraftPersistence(instanceId);
  
  return (
    <DraftContext.Provider value={draftContextValue}>
      {children}
    </DraftContext.Provider>
  );
}

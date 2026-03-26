'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_USER_ID } from '@/lib/constants';

export interface DraftContext {
  drafts: Record<string, Record<string, any>>;
  saveDraft: (stepId: string, content: Record<string, any>) => void;
  getDraft: (stepId: string) => Record<string, any> | null;
  isLoading: boolean;
  lastSaved: Record<string, string>;
}

/**
 * Hook to manage step-level draft persistence with auto-save and hydration.
 */
export function useDraftPersistence(instanceId: string): DraftContext {
  const [drafts, setDrafts] = useState<Record<string, Record<string, any>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Record<string, string>>({});
  
  // Refs for debouncing
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingChanges = useRef<Record<string, Record<string, any>>>({});

  // 1. Initial hydration on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadDrafts = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/drafts?instanceId=${instanceId}`);
        if (!res.ok) throw new Error('Failed to load drafts');
        
        const { data } = await res.json();
        
        if (isMounted && data) {
          setDrafts(data);
          
          // Initialize lastSaved from loaded data if we had timestamps (though they're not in the GET /api/drafts response yet)
          // For now we'll just leave them empty until a save happens
        }
      } catch (err) {
        console.error('[useDraftPersistence] Load failed:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDrafts();
    
    return () => {
      isMounted = false;
      // Cleanup timers on unmount
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, [instanceId]);

  // 2. Save function with debounce
  const saveDraft = useCallback((stepId: string, content: Record<string, any>) => {
    // Update local state immediately for UI responsiveness
    setDrafts(prev => ({
      ...prev,
      [stepId]: content
    }));

    // Store pending change
    pendingChanges.current[stepId] = content;

    // Clear existing timer for this step
    if (debounceTimers.current[stepId]) {
      clearTimeout(debounceTimers.current[stepId]);
    }

    // Set new timer
    debounceTimers.current[stepId] = setTimeout(async () => {
      const contentToSave = pendingChanges.current[stepId];
      if (!contentToSave) return;

      try {
        const res = await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instanceId,
            stepId,
            userId: DEFAULT_USER_ID,
            content: contentToSave
          })
        });

        if (res.ok) {
          setLastSaved(prev => ({
            ...prev,
            [stepId]: new Date().toISOString()
          }));
          delete pendingChanges.current[stepId];
        } else {
          console.error(`[useDraftPersistence] Save failed for step ${stepId}`);
        }
      } catch (err) {
        console.error(`[useDraftPersistence] Save failed for step ${stepId}:`, err);
      }
    }, 500);
  }, [instanceId]);

  // 3. Getter function
  const getDraft = useCallback((stepId: string) => {
    return drafts[stepId] || null;
  }, [drafts]);

  return {
    drafts,
    saveDraft,
    getDraft,
    isLoading,
    lastSaved
  };
}

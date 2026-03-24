'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import { COPY } from '@/lib/studio-copy';

interface HomeExperienceActionProps {
  id: string;
  isProposed?: boolean;
}

export default function HomeExperienceAction({ id, isProposed }: HomeExperienceActionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAcceptAndStart = async () => {
    setLoading(true);
    try {
      // Step 1: Approve
      let res = await fetch(`/api/experiences/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (!res.ok) throw new Error('Failed to approve');

      // Step 2: Publish
      res = await fetch(`/api/experiences/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      if (!res.ok) throw new Error('Failed to publish');

      // Step 3: Activate
      res = await fetch(`/api/experiences/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' }),
      });
      if (!res.ok) throw new Error('Failed to activate');

      router.push(ROUTES.workspace(id));
      router.refresh();
    } catch (error) {
      console.error('Workflow failed:', error);
      alert('Could not start journey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isProposed) {
    return (
      <button 
        onClick={handleAcceptAndStart}
        disabled={loading}
        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors py-1"
      >
        {loading ? 'Starting...' : COPY.library.acceptAndStart + ' →'}
      </button>
    );
  }

  return (
    <button 
      onClick={() => router.push(ROUTES.workspace(id))}
      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors py-1"
    >
      {COPY.library.enter} →
    </button>
  );
}

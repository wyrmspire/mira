import { notFound } from 'next/navigation';
import { getExperienceInstanceById } from '@/lib/services/experience-service';
import { getExperienceChain } from '@/lib/services/graph-service';
import WorkspaceClient from './WorkspaceClient';

export const dynamic = 'force-dynamic';

interface WorkspacePageProps {
  params: {
    instanceId: string;
  };
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { instanceId } = params;

  // Fetch instance + steps + chain context from services
  const [data, chainContext] = await Promise.all([
    getExperienceInstanceById(instanceId),
    getExperienceChain(instanceId)
  ]);

  if (!data) {
    notFound();
  }

  const { steps, ...instance } = data!;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0]">
      <WorkspaceClient instance={instance} steps={steps} chainContext={chainContext} />
    </div>
  );
}

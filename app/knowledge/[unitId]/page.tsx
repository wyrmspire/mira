import { getKnowledgeUnitById } from '@/lib/services/knowledge-service';
import { AppShell } from '@/components/shell/app-shell';
import KnowledgeUnitView from '@/components/knowledge/KnowledgeUnitView';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface KnowledgeUnitPageProps {
  params: {
    unitId: string;
  };
}

export default async function KnowledgeUnitPage({ params }: KnowledgeUnitPageProps) {
  const unit = await getKnowledgeUnitById(params.unitId);

  if (!unit) {
    notFound();
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto py-12">
        <KnowledgeUnitView unit={unit} />
      </div>
    </AppShell>
  );
}

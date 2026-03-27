import { AppShell } from '@/components/shell/app-shell';
import { getKnowledgeUnits, getKnowledgeDomains } from '@/lib/services/knowledge-service';
import { DEFAULT_USER_ID } from '@/lib/constants';
import { COPY } from '@/lib/studio-copy';
import KnowledgeClient from './KnowledgeClient';

export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  const userId = DEFAULT_USER_ID;

  // Parallel fetch for units and domain mapping
  const [units, domains] = await Promise.all([
    getKnowledgeUnits(userId),
    getKnowledgeDomains(userId),
  ]);

  // Sort units by created_at desc for "Recently Added"
  const recentlyAdded = [...units]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  // Find "Resume last topic" — most recently updated unit with mastery_status != 'confident'
  const resumeUnit = [...units]
    .filter(u => u.mastery_status !== 'confident')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0] || null;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto pb-20 px-4 md:px-8">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-[#f1f5f9] mb-2">{COPY.knowledge.heading}</h1>
          <p className="text-[#94a3b8] tracking-tight">{COPY.knowledge.subheading}</p>
        </header>

        <KnowledgeClient 
          units={units}
          domains={domains}
          recentlyAdded={recentlyAdded}
          resumeUnit={resumeUnit}
        />
      </div>
    </AppShell>
  );
}

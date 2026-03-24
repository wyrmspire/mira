import { AppShell } from '@/components/shell/app-shell';
import { 
  getActiveExperiences, 
  getCompletedExperiences, 
  getEphemeralExperiences, 
  getProposedExperiences 
} from '@/lib/services/experience-service';
import { DEFAULT_USER_ID } from '@/lib/constants';
import LibraryClient from './LibraryClient';
import { COPY } from '@/lib/studio-copy';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const userId = DEFAULT_USER_ID;

  // Parallel fetch for all sections
  const [active, completed, moments, proposed] = await Promise.all([
    getActiveExperiences(userId),
    getCompletedExperiences(userId),
    getEphemeralExperiences(userId),
    getProposedExperiences(userId),
  ]);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto pb-20 px-4 md:px-8">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-[#f1f5f9] mb-2">{COPY.library.heading}</h1>
          <p className="text-[#94a3b8] tracking-tight">{COPY.library.subheading}</p>
        </header>

        <LibraryClient 
          active={active}
          completed={completed}
          moments={moments}
          proposed={proposed}
        />
      </div>
    </AppShell>
  );
}

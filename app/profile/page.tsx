// app/profile/page.tsx
import { buildUserProfile } from '@/lib/services/facet-service'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { AppShell } from '@/components/shell/app-shell'
import { DirectionSummary } from '@/components/profile/DirectionSummary'
import { ProfileClient } from './ProfileClient'
import { COPY } from '@/lib/studio-copy'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const profile = await buildUserProfile(DEFAULT_USER_ID)

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        {/* Header */}
        <header>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            {COPY.profilePage.heading}
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            {COPY.profilePage.subheading}
          </p>
        </header>

        {/* Direction Summary */}
        <section>
          <DirectionSummary profile={profile} />
        </section>

        {/* Facet Engine */}
        <section className="pt-8 border-t border-slate-800">
          <ProfileClient profile={profile} />
        </section>
      </div>
    </AppShell>
  )
}

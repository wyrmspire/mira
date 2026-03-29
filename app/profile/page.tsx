import { buildUserProfile } from '@/lib/services/facet-service'
import { getGoalsForUser } from '@/lib/services/goal-service'
import { getSkillDomainsForUser } from '@/lib/services/skill-domain-service'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { AppShell } from '@/components/shell/app-shell'
import { DirectionSummary } from '@/components/profile/DirectionSummary'
import { SkillTrajectory } from '@/components/profile/SkillTrajectory'
import { ProfileClient } from './ProfileClient'
import { COPY } from '@/lib/studio-copy'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const [profile, goals, skillDomains] = await Promise.all([
    buildUserProfile(DEFAULT_USER_ID),
    getGoalsForUser(DEFAULT_USER_ID),
    getSkillDomainsForUser(DEFAULT_USER_ID)
  ])

  // Get active goal for trajectory
  const activeGoal = goals.find(g => g.status === 'active') || goals[0]
  const goalDomains = activeGoal 
    ? skillDomains.filter(d => d.goalId === activeGoal.id)
    : []

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
          <DirectionSummary 
            profile={profile} 
            activeGoal={activeGoal} 
            skillDomains={skillDomains}
          />
        </section>

        {/* Skill Trajectory */}
        {activeGoal && (
          <section className="pt-8 border-t border-slate-800">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              Active Trajectory: {activeGoal.title}
            </h2>
            <SkillTrajectory domains={goalDomains} />
          </section>
        )}

        {/* Facet Engine */}
        <section className="pt-12 border-t border-slate-800">
          <ProfileClient profile={profile} />
        </section>
      </div>
    </AppShell>
  )
}

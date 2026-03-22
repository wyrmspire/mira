import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

// Legacy path — redirect to canonical route
export default function DrillKillPathPage() {
  redirect(ROUTES.drillEnd)
}

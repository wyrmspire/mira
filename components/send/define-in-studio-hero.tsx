import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export function DefineInStudioHero() {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-6xl mb-4">◈</div>
      <h2 className="text-2xl font-bold text-[#e2e8f0] mb-3">
        Chat is where ideas are born.
      </h2>
      <p className="text-[#94a3b8] mb-6 max-w-sm mx-auto">
        Studio is where ideas are forced into truth.
      </p>
      <Link
        href={ROUTES.send}
        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500/20 text-indigo-300 rounded-xl font-medium hover:bg-indigo-500/30 transition-colors"
      >
        Define an Idea
      </Link>
    </div>
  )
}

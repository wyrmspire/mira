import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export default function DrillEndPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="text-5xl mb-6 opacity-40">†</div>
        <h1 className="text-2xl font-bold text-[#e2e8f0] mb-2">This idea is done.</h1>
        <p className="text-[#94a3b8] text-sm mb-8">
          Good ideas die too. That&apos;s how focus works. It&apos;s been preserved in the Graveyard.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={ROUTES.killed}
            className="px-6 py-3 bg-[#12121a] border border-[#1e1e2e] rounded-xl text-sm text-[#94a3b8] hover:text-[#e2e8f0] hover:border-[#2a2a3a] transition-colors"
          >
            View Graveyard
          </Link>
          <Link
            href={ROUTES.home}
            className="px-6 py-3 bg-indigo-500/20 text-indigo-400 rounded-xl text-sm font-medium hover:bg-indigo-500/30 transition-colors"
          >
            Back to Studio
          </Link>
        </div>
      </div>
    </div>
  )
}

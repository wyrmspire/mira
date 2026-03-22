import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export default function DrillEndPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full">
        <div className="mb-8 p-12 bg-red-500/5 rounded-full inline-block border border-red-500/10">
          <div className="text-5xl opacity-40 grayscale translate-y-[-2px]">†</div>
        </div>
        <h1 className="text-3xl font-bold text-[#e2e8f0] mb-3">Idea Removed.</h1>
        <p className="text-[#94a3b8] text-lg mb-10 leading-relaxed">
          The best way to ship great work is to kill almost everything else. 
          This idea has been moved to the Graveyard to keep your focus sharp.
        </p>
        <div className="flex flex-col gap-4">
          <Link
            href={ROUTES.send}
            className="px-6 py-4 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-2xl text-sm font-semibold hover:bg-indigo-500/20 transition-all active:scale-95"
          >
            See other ideas
          </Link>
          <Link
            href={ROUTES.home}
            className="px-6 py-4 bg-[#12121a] text-[#94a3b8] hover:text-[#e2e8f0] border border-[#1e1e2e] hover:border-[#2a2a3a] rounded-2xl text-sm font-medium transition-all"
          >
            Back to Home
          </Link>
          <div className="pt-4">
            <Link href={ROUTES.killed} className="text-xs text-[#4b5563] hover:text-[#94a3b8] transition-colors">
              Visit the Graveyard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

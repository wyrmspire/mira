import { AppShell } from '@/components/shell/app-shell'
import { GPTIdeaForm } from '@/components/dev/gpt-idea-form'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export default function GPTSendPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-10 py-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Link href={ROUTES.home} className="text-[#4a4a6a] hover:text-[#e2e8f0] transition-colors text-sm">
              ← Back to Studio
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">Dev Harness: GPT Idea Capture</h1>
          <p className="text-[#64748b] text-sm leading-relaxed">
            Use this page to simulate an idea arriving from your custom GPT. It will POST to 
            <code className="mx-1 px-1.5 py-0.5 bg-[#12121a] text-indigo-400 rounded text-xs select-all">/api/webhook/gpt</code> 
            using the production contract, including data validation and inbox notification.
          </p>
        </div>

        <div className="p-8 bg-[#0d0d18] border border-[#1e1e2e] rounded-2xl shadow-2xl">
          <GPTIdeaForm />
        </div>

        <div className="text-center">
          <p className="text-[#4a4a6a] text-xs">
            The data sent here is persisted exactly like a real GPT submission.
          </p>
        </div>
      </div>
    </AppShell>
  )
}

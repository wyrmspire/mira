'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

export function GPTIdeaForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null as string | null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const payload = {
      source: 'gpt',
      event: 'idea_captured',
      data: {
        title: formData.get('title'),
        rawPrompt: formData.get('rawPrompt'),
        gptSummary: formData.get('gptSummary'),
        vibe: formData.get('vibe') || undefined,
        audience: formData.get('audience') || undefined,
      },
      timestamp: new Date().toISOString(),
    }

    try {
      const res = await fetch('/api/webhook/gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(ROUTES.send)
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 text-center">
        <div className="text-emerald-400 text-4xl mb-4">✓</div>
        <h3 className="text-[#e2e8f0] font-semibold mb-2">Idea Sent!</h3>
        <p className="text-[#94a3b8] text-sm">Redirecting to capture list...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
          Idea Title
        </label>
        <input
          required
          id="title"
          name="title"
          placeholder="e.g., Personal CRM for Solopreneurs"
          className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="gptSummary" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
          GPT Summary (One-liner)
        </label>
        <input
          required
          id="gptSummary"
          name="gptSummary"
          placeholder="A short, catchy summary of the idea."
          className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="rawPrompt" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
          Raw Prompt / Full Context
        </label>
        <textarea
          required
          id="rawPrompt"
          name="rawPrompt"
          rows={6}
          placeholder="Paste the full GPT conversation or raw prompt here..."
          className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors font-mono text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="vibe" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
            Vibe (optional)
          </label>
          <input
            id="vibe"
            name="vibe"
            placeholder="e.g., productivity"
            className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
          />
        </div>
        <div>
          <label htmlFor="audience" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
            Audience (optional)
          </label>
          <input
            id="audience"
            name="audience"
            placeholder="e.g., indie hackers"
            className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
          />
        </div>
      </div>

      <button
        disabled={loading}
        type="submit"
        className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(99,102,241,0.2)]"
      >
        {loading ? 'Sending...' : 'Simulate GPT Send'}
      </button>
    </form>
  )
}

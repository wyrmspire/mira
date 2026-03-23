'use client'

/**
 * app/dev/github-playground/page.tsx
 *
 * Dev harness for testing GitHub integration.
 * Sections:
 *   1. Connection test  — GET /api/github/test-connection
 *   2. Create issue     — POST /api/github/create-issue
 *   3. List / Sync PRs  — GET/POST /api/github/sync-pr
 *   4. Dispatch workflow — POST /api/github/dispatch-workflow
 *   5. Merge PR         — POST /api/github/merge-pr
 *
 * Styled to match the gpt-send dev harness (dark studio theme).
 */

import { useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ResultState = {
  loading: boolean
  data: unknown
  error: string | null
}

const defaultResult: ResultState = { loading: false, data: null, error: null }

// ---------------------------------------------------------------------------
// Shared UI helpers
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="p-8 bg-[#0d0d18] border border-[#1e1e2e] rounded-2xl shadow-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#e2e8f0] mb-1">{title}</h2>
        <p className="text-[#64748b] text-sm">{description}</p>
      </div>
      {children}
    </div>
  )
}

function ResultBlock({ result }: { result: ResultState }) {
  if (result.loading) {
    return (
      <div className="text-[#64748b] text-sm animate-pulse">Running…</div>
    )
  }
  if (result.error) {
    return (
      <pre className="mt-2 p-3 bg-red-950/30 border border-red-800/40 rounded-lg text-red-400 text-xs overflow-x-auto whitespace-pre-wrap">
        {result.error}
      </pre>
    )
  }
  if (result.data) {
    return (
      <pre className="mt-2 p-3 bg-[#12121a] border border-[#1e1e2e] rounded-lg text-indigo-300 text-xs overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(result.data, null, 2)}
      </pre>
    )
  }
  return null
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-[#64748b] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-[#12121a] border border-[#1e1e2e] rounded-lg text-[#e2e8f0] text-sm placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500 transition-colors"
      />
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-[#64748b] mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 bg-[#12121a] border border-[#1e1e2e] rounded-lg text-[#e2e8f0] text-sm placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500 transition-colors resize-none"
      />
    </div>
  )
}

function ActionButton({
  onClick,
  loading,
  children,
}: {
  onClick: () => void
  loading: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
    >
      {loading ? 'Working…' : children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// API caller utility
// ---------------------------------------------------------------------------

async function callApi(
  url: string,
  method: 'GET' | 'POST',
  body?: unknown
): Promise<{ data?: unknown; error?: string }> {
  const res = await fetch(url, {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  return json
}

// ---------------------------------------------------------------------------
// Section components
// ---------------------------------------------------------------------------

function ConnectionSection() {
  const [result, setResult] = useState<ResultState>(defaultResult)

  async function handleTest() {
    setResult({ loading: true, data: null, error: null })
    try {
      const json = await callApi('/api/github/test-connection', 'GET')
      setResult({ loading: false, data: json, error: null })
    } catch (e) {
      setResult({ loading: false, data: null, error: String(e) })
    }
  }

  return (
    <SectionCard
      title="1 · Connection Test"
      description="Validates your GITHUB_TOKEN and confirms the repo is accessible."
    >
      <ActionButton onClick={handleTest} loading={result.loading}>
        Test Connection
      </ActionButton>
      <ResultBlock result={result} />
    </SectionCard>
  )
}

function CreateIssueSection() {
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [result, setResult] = useState<ResultState>(defaultResult)

  async function handleSubmit() {
    setResult({ loading: true, data: null, error: null })
    try {
      const payload = projectId.trim()
        ? { projectId: projectId.trim() }
        : { title: title.trim(), body: body.trim() }

      const json = await callApi('/api/github/create-issue', 'POST', payload)
      if (json.error) {
        setResult({ loading: false, data: null, error: json.error as string })
      } else {
        setResult({ loading: false, data: json.data, error: null })
      }
    } catch (e) {
      setResult({ loading: false, data: null, error: String(e) })
    }
  }

  return (
    <SectionCard
      title="2 · Create Issue"
      description="Provide a Project ID to create from project, OR a title/body for a standalone issue."
    >
      <div className="space-y-3">
        <InputField
          label="Project ID (option A)"
          value={projectId}
          onChange={setProjectId}
          placeholder="proj-xxxx"
        />
        <p className="text-center text-[#4a4a6a] text-xs">— or standalone —</p>
        <InputField
          label="Issue Title (option B)"
          value={title}
          onChange={setTitle}
          placeholder="My feature request"
        />
        <TextAreaField
          label="Issue Body"
          value={body}
          onChange={setBody}
          placeholder="Describe the issue…"
        />
      </div>
      <ActionButton onClick={handleSubmit} loading={result.loading}>
        Create Issue
      </ActionButton>
      <ResultBlock result={result} />
    </SectionCard>
  )
}

function SyncPRsSection() {
  const [prNumber, setPrNumber] = useState('')
  const [syncResult, setSyncResult] = useState<ResultState>(defaultResult)
  const [batchResult, setBatchResult] = useState<ResultState>(defaultResult)

  async function handleSingleSync() {
    if (!prNumber.trim()) return
    setSyncResult({ loading: true, data: null, error: null })
    try {
      const json = await callApi('/api/github/sync-pr', 'POST', {
        prNumber: Number(prNumber),
      })
      if (json.error) {
        setSyncResult({ loading: false, data: null, error: json.error as string })
      } else {
        setSyncResult({ loading: false, data: json.data, error: null })
      }
    } catch (e) {
      setSyncResult({ loading: false, data: null, error: String(e) })
    }
  }

  async function handleBatchSync() {
    setBatchResult({ loading: true, data: null, error: null })
    try {
      const json = await callApi('/api/github/sync-pr', 'GET')
      if (json.error) {
        setBatchResult({ loading: false, data: null, error: json.error as string })
      } else {
        setBatchResult({ loading: false, data: json.data, error: null })
      }
    } catch (e) {
      setBatchResult({ loading: false, data: null, error: String(e) })
    }
  }

  return (
    <SectionCard
      title="3 · Sync PRs"
      description="Sync a single PR by number, or batch-sync all open PRs from GitHub."
    >
      <div className="space-y-3">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <InputField
              label="PR Number"
              value={prNumber}
              onChange={setPrNumber}
              placeholder="42"
              type="number"
            />
          </div>
          <ActionButton onClick={handleSingleSync} loading={syncResult.loading}>
            Sync #
          </ActionButton>
        </div>
        <ResultBlock result={syncResult} />

        <div className="border-t border-[#1e1e2e] pt-4">
          <ActionButton onClick={handleBatchSync} loading={batchResult.loading}>
            Sync All Open PRs
          </ActionButton>
          <ResultBlock result={batchResult} />
        </div>
      </div>
    </SectionCard>
  )
}

function DispatchWorkflowSection() {
  const [projectId, setProjectId] = useState('')
  const [workflowId, setWorkflowId] = useState('')
  const [inputs, setInputs] = useState('')
  const [result, setResult] = useState<ResultState>(defaultResult)

  async function handleDispatch() {
    if (!projectId.trim()) return
    setResult({ loading: true, data: null, error: null })

    let parsedInputs: Record<string, string> | undefined
    if (inputs.trim()) {
      try {
        parsedInputs = JSON.parse(inputs) as Record<string, string>
      } catch {
        setResult({ loading: false, data: null, error: 'Inputs must be valid JSON' })
        return
      }
    }

    try {
      const payload: Record<string, unknown> = { projectId: projectId.trim() }
      if (workflowId.trim()) payload.workflowId = workflowId.trim()
      if (parsedInputs) payload.inputs = parsedInputs

      const json = await callApi('/api/github/dispatch-workflow', 'POST', payload)
      if (json.error) {
        setResult({ loading: false, data: null, error: json.error as string })
      } else {
        setResult({ loading: false, data: json.data, error: null })
      }
    } catch (e) {
      setResult({ loading: false, data: null, error: String(e) })
    }
  }

  return (
    <SectionCard
      title="4 · Dispatch Workflow"
      description="Trigger a GitHub Actions workflow_dispatch event. Uses GITHUB_WORKFLOW_PROTOTYPE by default."
    >
      <div className="space-y-3">
        <InputField
          label="Project ID"
          value={projectId}
          onChange={setProjectId}
          placeholder="proj-xxxx"
        />
        <InputField
          label="Workflow ID (optional — overrides default)"
          value={workflowId}
          onChange={setWorkflowId}
          placeholder="copilot-prototype.yml"
        />
        <TextAreaField
          label='Inputs JSON (optional, e.g. {"key": "value"})'
          value={inputs}
          onChange={setInputs}
          placeholder='{"branch": "feat/my-feature"}'
        />
      </div>
      <ActionButton onClick={handleDispatch} loading={result.loading}>
        Dispatch Workflow
      </ActionButton>
      <ResultBlock result={result} />
    </SectionCard>
  )
}

function MergePRSection() {
  const [projectId, setProjectId] = useState('')
  const [prNumber, setPrNumber] = useState('')
  const [mergeMethod, setMergeMethod] = useState<'merge' | 'squash' | 'rebase'>('squash')
  const [result, setResult] = useState<ResultState>(defaultResult)

  async function handleMerge() {
    if (!projectId.trim() || !prNumber.trim()) return
    setResult({ loading: true, data: null, error: null })

    try {
      const json = await callApi('/api/github/merge-pr', 'POST', {
        projectId: projectId.trim(),
        prNumber: Number(prNumber),
        mergeMethod,
      })
      if (json.error) {
        setResult({ loading: false, data: null, error: json.error as string })
      } else {
        setResult({ loading: false, data: json.data, error: null })
      }
    } catch (e) {
      setResult({ loading: false, data: null, error: String(e) })
    }
  }

  return (
    <SectionCard
      title="5 · Merge PR"
      description="Merge a GitHub PR with real policy enforcement (PR must be open and conflict-free)."
    >
      <div className="space-y-3">
        <InputField
          label="Project ID"
          value={projectId}
          onChange={setProjectId}
          placeholder="proj-xxxx"
        />
        <InputField
          label="PR Number"
          value={prNumber}
          onChange={setPrNumber}
          placeholder="42"
          type="number"
        />
        <div>
          <label className="block text-xs text-[#64748b] mb-1">Merge Method</label>
          <div className="flex gap-3">
            {(['merge', 'squash', 'rebase'] as const).map((m) => (
              <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="mergeMethod"
                  value={m}
                  checked={mergeMethod === m}
                  onChange={() => setMergeMethod(m)}
                  className="accent-indigo-500"
                />
                <span className="text-sm text-[#e2e8f0] capitalize">{m}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <ActionButton onClick={handleMerge} loading={result.loading}>
        Merge PR
      </ActionButton>
      <ResultBlock result={result} />
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GitHubPlaygroundPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-10 py-10 px-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Link
            href={ROUTES.home}
            className="text-[#4a4a6a] hover:text-[#e2e8f0] transition-colors text-sm"
          >
            ← Back to Studio
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">
          Dev Harness: GitHub Integration
        </h1>
        <p className="text-[#64748b] text-sm leading-relaxed">
          Use this page to test GitHub API operations against the routes in{' '}
          <code className="mx-1 px-1.5 py-0.5 bg-[#12121a] text-indigo-400 rounded text-xs">
            /api/github/*
          </code>
          . All actions hit the real GitHub API — use a test repo.
        </p>
      </div>

      {/* Sections */}
      <ConnectionSection />
      <CreateIssueSection />
      <SyncPRsSection />
      <DispatchWorkflowSection />
      <MergePRSection />

      {/* Footer note */}
      <div className="text-center">
        <p className="text-[#4a4a6a] text-xs">
          Actions here hit real GitHub. Ensure your token has the required scopes (
          <code className="text-indigo-400 text-xs">repo</code>,{' '}
          <code className="text-indigo-400 text-xs">workflow</code>).
        </p>
      </div>
    </div>
  )
}

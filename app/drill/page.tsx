'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DrillLayout } from '@/components/drill/drill-layout'
import { DrillProgress } from '@/components/drill/drill-progress'
import { GiantChoiceButton } from '@/components/drill/giant-choice-button'
import { ROUTES } from '@/lib/routes'

type Scope = 'small' | 'medium' | 'large'
type ExecutionPath = 'solo' | 'assisted' | 'delegated'
type Urgency = 'now' | 'later' | 'never'
type Decision = 'arena' | 'icebox' | 'killed'

interface DrillState {
  intent: string
  successMetric: string
  scope: Scope | null
  executionPath: ExecutionPath | null
  urgency: Urgency | null
  decision: Decision | null
}

const STEPS = ['intent', 'success_metric', 'scope', 'path', 'priority', 'decision'] as const
type Step = (typeof STEPS)[number]
const CHOICE_ADVANCE_DELAY_MS = 300

export default function DrillPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <p className="text-[#94a3b8]">Loading…</p>
      </div>
    }>
      <DrillContent />
    </Suspense>
  )
}

function DrillContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ideaId = searchParams.get('ideaId') ?? ''

  const [currentStep, setCurrentStep] = useState(0)
  const [state, setState] = useState<DrillState>({
    intent: '',
    successMetric: '',
    scope: null,
    executionPath: null,
    urgency: null,
    decision: null,
  })

  const step = STEPS[currentStep]
  const totalSteps = STEPS.length

  function advance() {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1)
    }
  }

  function back() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && canAdvance()) advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function canAdvance(): boolean {
    if (step === 'intent') return state.intent.trim().length > 0
    if (step === 'success_metric') return state.successMetric.trim().length > 0
    if (step === 'scope') return state.scope !== null
    if (step === 'path') return state.executionPath !== null
    if (step === 'priority') return state.urgency !== null
    if (step === 'decision') return state.decision !== null
    return false
  }

  function handleDecision(decision: Decision) {
    const newState = { ...state, decision }
    setState(newState)
    if (decision === 'arena') {
      router.push(`${ROUTES.drillSuccess}?ideaId=${ideaId}`)
    } else if (decision === 'killed') {
      router.push(`${ROUTES.drillEnd}?ideaId=${ideaId}`)
    } else {
      router.push(`${ROUTES.icebox}`)
    }
  }

  return (
    <DrillLayout
      progress={
        <DrillProgress
          current={currentStep + 1}
          total={totalSteps}
          stepLabel={`Step ${currentStep + 1} of ${totalSteps}`}
        />
      }
    >
      <div className="space-y-8">
        {step === 'intent' && (
          <StepText
            question="What is this really?"
            hint="Strip the excitement. What is the actual thing?"
            value={state.intent}
            onChange={(v) => setState({ ...state, intent: v })}
            onNext={advance}
            onBack={currentStep > 0 ? back : undefined}
            canNext={canAdvance()}
          />
        )}
        {step === 'success_metric' && (
          <StepText
            question="How do you know it worked?"
            hint="One metric. If you can't name it, the idea isn't ready."
            value={state.successMetric}
            onChange={(v) => setState({ ...state, successMetric: v })}
            onNext={advance}
            onBack={back}
            canNext={canAdvance()}
          />
        )}
        {step === 'scope' && (
          <StepChoice
            question="How big is this?"
            hint="Be honest. Scope creep starts here."
            onBack={back}
          >
            <GiantChoiceButton
              label="Small"
              description="A week or less. Ship fast."
              selected={state.scope === 'small'}
              onClick={() => { setState({ ...state, scope: 'small' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
            />
            <GiantChoiceButton
              label="Medium"
              description="Two to four weeks. Needs a plan."
              selected={state.scope === 'medium'}
              onClick={() => { setState({ ...state, scope: 'medium' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
            />
            <GiantChoiceButton
              label="Large"
              description="Over a month. Be careful."
              selected={state.scope === 'large'}
              onClick={() => { setState({ ...state, scope: 'large' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
              variant="danger"
            />
          </StepChoice>
        )}
        {step === 'path' && (
          <StepChoice
            question="How does this get built?"
            hint="Solo, assisted, or fully delegated?"
            onBack={back}
          >
            <GiantChoiceButton
              label="Solo"
              description="You build it yourself."
              selected={state.executionPath === 'solo'}
              onClick={() => { setState({ ...state, executionPath: 'solo' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
            />
            <GiantChoiceButton
              label="Assisted"
              description="You lead, AI or others help."
              selected={state.executionPath === 'assisted'}
              onClick={() => { setState({ ...state, executionPath: 'assisted' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
            />
            <GiantChoiceButton
              label="Delegated"
              description="Handed off to someone else."
              selected={state.executionPath === 'delegated'}
              onClick={() => { setState({ ...state, executionPath: 'delegated' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
              variant="ice"
            />
          </StepChoice>
        )}
        {step === 'priority' && (
          <StepChoice
            question="Does this belong now?"
            hint="What would you not do if you commit to this?"
            onBack={back}
          >
            <GiantChoiceButton
              label="Now"
              description="This is urgent and important."
              selected={state.urgency === 'now'}
              onClick={() => { setState({ ...state, urgency: 'now' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
              variant="success"
            />
            <GiantChoiceButton
              label="Later"
              description="Good idea, wrong timing."
              selected={state.urgency === 'later'}
              onClick={() => { setState({ ...state, urgency: 'later' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
              variant="ice"
            />
            <GiantChoiceButton
              label="Never"
              description="Honest answer: this won't happen."
              selected={state.urgency === 'never'}
              onClick={() => { setState({ ...state, urgency: 'never' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
              variant="danger"
            />
          </StepChoice>
        )}
        {step === 'decision' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{"What's the call?"}</h2>
              <p className="text-[#94a3b8]">Arena, Icebox, or Remove. No limbo.</p>
            </div>
            <div className="space-y-3">
              <GiantChoiceButton
                label="Commit to Arena"
                description="This gets built. Now."
                onClick={() => handleDecision('arena')}
                variant="success"
              />
              <GiantChoiceButton
                label="Send to Icebox"
                description="Not now. Maybe later."
                onClick={() => handleDecision('icebox')}
                variant="ice"
              />
              <GiantChoiceButton
                label="Remove this idea"
                description="It's not worth pursuing. Let it go."
                onClick={() => handleDecision('killed')}
                variant="danger"
              />
            </div>
            <div className="mt-6">
              <button onClick={back} className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">
                ← Back
              </button>
            </div>
          </div>
        )}
      </div>
    </DrillLayout>
  )
}

function StepText({
  question,
  hint,
  value,
  onChange,
  onNext,
  onBack,
  canNext,
}: {
  question: string
  hint: string
  value: string
  onChange: (v: string) => void
  onNext: () => void
  onBack?: () => void
  canNext: boolean
}) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{question}</h2>
        <p className="text-[#94a3b8]">{hint}</p>
      </div>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer…"
        rows={4}
        className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-xl px-4 py-3 text-[#e2e8f0] placeholder-[#94a3b8]/50 text-lg resize-none focus:outline-none focus:border-indigo-500/40 transition-colors"
      />
      <div className="flex items-center justify-between mt-6">
        {onBack ? (
          <button onClick={onBack} className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">
            ← Back
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={onNext}
          disabled={!canNext}
          className="px-6 py-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

function StepChoice({
  question,
  hint,
  children,
  onBack,
}: {
  question: string
  hint: string
  children: React.ReactNode
  onBack?: () => void
}) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{question}</h2>
        <p className="text-[#94a3b8]">{hint}</p>
      </div>
      <div className="space-y-3">{children}</div>
      {onBack && (
        <div className="mt-6">
          <button onClick={onBack} className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}

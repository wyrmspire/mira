                      answers[currentQuestion.id] === option
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                        : showError 
                          ? 'bg-[#12121a] border-rose-500/20 text-[#64748b] hover:border-rose-500/40' 
                          : 'bg-[#12121a] border-[#1e1e2e] text-[#94a3b8] hover:border-[#33334d]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'scale' && (
              <div className={`flex justify-between items-center bg-[#12121a] border rounded-2xl p-6 transition-all ${
                showError ? 'border-rose-500/30' : 'border-[#1e1e2e]'
              }`}>
                {(currentQuestion.options?.length ? currentQuestion.options.map((_, i) => i + 1) : [1, 2, 3, 4, 5]).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleInputChange(currentQuestion.id, val.toString())}
                    className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all text-lg font-bold ${
                      answers[currentQuestion.id] === val.toString()
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 scale-110 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                        : 'bg-[#1a1a2e] border-[#33334d] text-[#475569] hover:border-indigo-500/30 hover:text-[#94a3b8]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-8 border-t border-[#1e1e2e]">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentIndex === 0}
            className="text-sm text-[#475569] hover:text-[#94a3b8] transition-colors disabled:opacity-0"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Skip for now
          </button>
        </div>
        
        <button
          type="button"
          onClick={handleNext}
          className="px-10 py-4 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          {currentIndex < totalQuestions - 1 ? 'Next Question →' : 'Finish Questionnaire →'}
        </button>
      </div>
    </div>
  );
}

```

### components/experience/steps/ReflectionStep.tsx

```tsx
'use client';

import React, { useState } from 'react';
import { ExperienceStep, ExperienceBlock } from '@/types/experience';
import ReactMarkdown from 'react-markdown';
import BlockRenderer from '../blocks/BlockRenderer';

interface ReflectionPayload {
  prompts?: Array<{
    id: string;
    text: string;
    format?: 'free_text';
  }>;
  blocks?: ExperienceBlock[];
}

interface ReflectionStepProps {
  step: ExperienceStep;
  onComplete: (payload: { reflections: Record<string, string> }) => void;
  onSkip: () => void;
  onDraft?: (draft: Record<string, any>) => void;
  readOnly?: boolean;
  initialResponses?: Record<string, string>;
}

export default function ReflectionStep({ step, onComplete, onSkip, onDraft, readOnly, initialResponses }: ReflectionStepProps) {
  const [responses, setResponses] = useState<Record<string, string>>(initialResponses || {});
  const payload = step.payload as ReflectionPayload | null;
  const prompts = payload?.prompts ?? [];
  const blocks = payload?.blocks ?? [];
  const hasBlocks = blocks.length > 0;

  const handleChange = (promptId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [promptId]: value }));
  };

  const handleBlur = (promptId: string) => {
    if (onDraft && responses[promptId]) {
      onDraft({ [promptId]: responses[promptId] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ reflections: responses });
  };

  const isComplete = prompts.length === 0 || prompts.every((p) => !!responses[p.id]?.trim());

  if (readOnly) {
    return (
      <div className="space-y-12 animate-in fade-in duration-700 max-w-2xl mx-auto">
        <div className="border-l-4 border-violet-500 pl-6 mb-12">
          <h2 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight mb-2">{step.title}</h2>
          <p className="text-sm text-violet-400 uppercase tracking-[0.2em] font-bold">Past Perspective</p>
        </div>
        
        <div className="space-y-16">
          {hasBlocks ? (
            <div className="space-y-10">
              {blocks.map((block, idx) => (
                <BlockRenderer key={block.id || idx} block={block} />
              ))}
            </div>
          ) : (
            prompts.map((p) => (
              <div key={p.id} className="space-y-6">
                <div className="prose prose-invert prose-indigo max-w-none prose-p:text-xl prose-p:font-bold prose-p:text-[#475569] prose-p:leading-relaxed">
                  <ReactMarkdown>{p.text}</ReactMarkdown>
                </div>
                <div className="p-8 bg-violet-500/5 border-l-2 border-violet-500/30 rounded-r-2xl italic">
                  <p className="text-2xl text-[#e2e8f0] font-serif leading-[1.8] whitespace-pre-wrap">
                    "{responses[p.id] || 'No reflection logged.'}"
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-2xl mx-auto">
      <div className="mb-8 border-l-4 border-violet-500 pl-6">
        <h2 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight mb-2">{step.title}</h2>
        <p className="text-sm text-violet-400 uppercase tracking-[0.2em] font-bold">Reflection Process</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-16">
        {hasBlocks ? (
          <div className="space-y-10">
            {blocks.map((block, idx) => (
              <BlockRenderer 
                key={block.id || idx} 
                block={block} 
                instanceId={step.instance_id}
                stepId={step.id}
              />
            ))}
          </div>
        ) : (
          <>
            {prompts.length === 0 && (
              <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
                <p className="text-[#64748b] text-lg">Reflection prompts are being prepared.</p>
              </div>
            )}
            {prompts.map((prompt, idx) => {
              const wordCount = responses[prompt.id]?.trim().split(/\s+/).filter(Boolean).length || 0;
              return (
                <div 
                  key={prompt.id} 
                  className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
                  style={{ animationDelay: `${idx * 150}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex justify-between items-end">
                    <div className="prose prose-invert prose-indigo max-w-none prose-p:text-xl prose-p:font-semibold prose-p:text-[#e2e8f0] prose-p:leading-relaxed max-w-[80%]">
                      <ReactMarkdown>{prompt.text}</ReactMarkdown>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded transition-colors ${
                      wordCount > 0 ? 'text-violet-400 bg-violet-400/10' : 'text-[#475569] bg-[#1a1a2e]'
                    }`}>
                      {wordCount} WORDS
                    </span>
                  </div>
                  
                  <div className="relative">
                    <textarea
                      value={responses[prompt.id] || ''}
                      onChange={(e) => handleChange(prompt.id, e.target.value)}
                      onBlur={() => handleBlur(prompt.id)}
                      placeholder="Share your thoughts honestly…"
                      rows={5}
                      className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-2xl px-6 py-5 text-lg text-[#f1f5f9] placeholder-[#94a3b8]/20 focus:outline-none focus:border-violet-500/40 focus:bg-[#161625] transition-all resize-none leading-relaxed shadow-inner"
                    />
                    <div className="absolute bottom-4 right-4 flex gap-2">
                       {responses[prompt.id] && (
                         <span className="text-[10px] text-emerald-400/50 font-mono animate-pulse">DRAFT SAVED</span>
                       )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        <div className="flex items-center justify-between pt-10 border-t border-[#1e1e2e]">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Skip for now
          </button>
          
          <div className="flex flex-col items-end gap-3">
            {!isComplete && (
               <p className="text-[10px] text-violet-400/70 font-mono tracking-widest">
                 AWAITING YOUR INSIGHTS
               </p>
            )}
            <button
              type="submit"
              disabled={!isComplete}
              className="px-12 py-4 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-500 transition-all disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed shadow-xl shadow-violet-900/20 active:scale-95"
            >
              Finish Reflection →
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

```

### components/experience/TrackCard.tsx

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { CurriculumOutline } from '@/types/curriculum';
import { ROUTES } from '@/lib/routes';

interface TrackCardProps {
  outline: CurriculumOutline;
}

export default function TrackCard({ outline }: TrackCardProps) {
  const completedCount = outline.subtopics.filter(s => s.status === 'completed').length;
  const totalCount = outline.subtopics.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Find next target for "Continue" button
  const nextSubtopic = outline.subtopics.find(s => s.status !== 'completed');
  const continueHref = nextSubtopic?.experienceId ? ROUTES.workspace(nextSubtopic.experienceId) : null;

  const getStatusIcon = (status: 'pending' | 'in_progress' | 'completed') => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        );
      case 'in_progress':
        return (
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse ring-2 ring-indigo-500/20" />
        );
      default:
        return (
          <div className="w-1.5 h-1.5 rounded-full border border-[#33334d]" />
        );
    }
  };

  return (
    <div className="flex flex-col p-6 bg-[#000000] border border-[#1e1e2e] rounded-2xl hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-indigo-500/5 min-h-[380px]">
      <div className="flex justify-between items-start mb-4">
        <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
          Track
        </div>
        {outline.domain && (
          <div className="text-[10px] font-mono text-[#4a4a6a] uppercase tracking-tighter">
            {outline.domain}
          </div>
        )}
      </div>

      <h3 className="text-xl font-bold text-[#f1f5f9] mb-2 group-hover:text-indigo-300 transition-colors">
        {outline.topic}
      </h3>

      <div className="mb-6">
        <div className="flex justify-between text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
          <span>Completion</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full bg-[#1e1e2e] rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="space-y-5 mb-8 overflow-y-auto max-h-[180px] pr-2 scrollbar-none">
        {outline.subtopics.map((subtopic, idx) => (
          <div key={idx} className="flex items-start gap-4 group/subtopic">
            <div className="mt-1 flex-shrink-0">{getStatusIcon(subtopic.status)}</div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-bold leading-tight truncate ${subtopic.status === 'completed' ? 'text-[#4a4a6a]' : 'text-[#e2e8f0]'}`}>
                  {subtopic.title}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  subtopic.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500/70 border border-emerald-500/10' :
                  subtopic.status === 'in_progress' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                  'bg-[#1e1e2e] text-[#4a4a6a] border border-[#33334d]'
                }`}>
                  {subtopic.status === 'completed' ? 'Done' : 
                   subtopic.status === 'in_progress' ? 'In Progress' : 'Pending'}
                </span>
              </div>
              <p className="text-[10px] text-[#64748b] line-clamp-2 leading-relaxed italic">
                {subtopic.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto">
        {continueHref ? (
          <Link 
            href={continueHref}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
          >
            Continue Journey
          </Link>
        ) : (
          <div className="w-full py-4 text-center text-[10px] font-bold text-[#4a4a6a] bg-[#000000] rounded-xl border border-dashed border-[#33334d] uppercase tracking-widest">
            {outline.status === 'planning' ? 'Planning in progress...' : 'Awaiting next experience'}
          </div>
        )}
      </div>
    </div>
  );
}

```

### components/experience/TrackSection.tsx

```tsx
'use client';

import React from 'react';
import { CurriculumOutline } from '@/types/curriculum';
import TrackCard from './TrackCard';
import { COPY } from '@/lib/studio-copy';

interface TrackSectionProps {
  outlines: CurriculumOutline[];
}

export default function TrackSection({ outlines }: TrackSectionProps) {
  if (outlines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-indigo-500/5 rounded-3xl border border-dashed border-indigo-500/20 text-center mb-16">
        <span className="text-4xl mb-4">🗺️</span>
        <h2 className="text-lg font-bold text-[#f1f5f9] mb-2">{COPY.library.tracksSection}</h2>
        <p className="text-sm text-[#94a3b8] max-w-xs">{COPY.library.emptyTracks}</p>
      </div>
    );
  }

  return (
    <section className="mb-20">
      <div className="flex items-center gap-4 mb-10 overflow-hidden">
        <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest whitespace-nowrap">
          {COPY.library.tracksSection}
        </h2>
        <div className="h-px w-full bg-[#1e1e2e]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {outlines.map((outline) => (
          <TrackCard key={outline.id} outline={outline} />
        ))}
      </div>
    </section>
  );
}

```

### components/icebox/icebox-card.tsx

```tsx
import type { IceboxItem } from '@/lib/view-models/icebox-view-model'
import { COPY } from '@/lib/studio-copy'

interface IceboxCardProps {
  item: IceboxItem
}

export function IceboxCard({ item }: IceboxCardProps) {
  return (
    <div
      className={`bg-[#12121a] border rounded-xl p-5 transition-colors ${
        item.isStale ? 'border-amber-500/30' : 'border-[#1e1e2e]'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <span className="text-xs text-[#94a3b8] uppercase tracking-wide">
            {item.type === 'idea' ? 'Idea' : 'Project'}
          </span>
          <h3 className="font-semibold text-[#e2e8f0] mt-0.5">{item.title}</h3>
        </div>
        <span
          className={`text-xs flex-shrink-0 ${
            item.isStale ? 'text-amber-400' : 'text-[#94a3b8]'
          }`}
        >
          {item.daysInIcebox}d
        </span>
      </div>
      <p className="text-sm text-[#94a3b8] line-clamp-2">{item.summary}</p>
      {item.isStale && (
        <p className="text-xs text-amber-400 mt-2">
          {COPY.icebox.staleWarning.replace('{days}', String(item.daysInIcebox))}
        </p>
      )}
    </div>
  )
}

```

### components/icebox/stale-idea-modal.tsx

```tsx
'use client'

interface StaleIdeaModalProps {
  open: boolean
  title: string
  daysInIcebox: number
  onPromote: () => void
  onDiscard: () => void
  onClose: () => void
}

export function StaleIdeaModal({
  open,
  title,
  daysInIcebox,
  onPromote,
  onDiscard,
  onClose,
}: StaleIdeaModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#12121a] border border-amber-500/30 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-2xl mb-3">❄</div>
        <h3 className="text-lg font-semibold text-[#e2e8f0] mb-1">{title}</h3>
        <p className="text-sm text-amber-400 mb-4">
          This has been on hold for {daysInIcebox} days. Time to decide.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onPromote}
            className="px-4 py-2.5 text-sm font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
          >
            Start building
          </button>
          <button
            onClick={onDiscard}
            className="px-4 py-2.5 text-sm text-red-400/80 border border-[#1e1e2e] rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors"
          >
            Remove this idea
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
          >
            Keep on hold
          </button>
        </div>
      </div>
    </div>
  )
}

```

### components/icebox/triage-actions.tsx

```tsx
'use client'

interface TriageActionsProps {
  onPromote: () => void
  onDiscard: () => void
}

export function TriageActions({ onPromote, onDiscard }: TriageActionsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onPromote}
        className="flex-1 px-3 py-2 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
      >
        Promote
      </button>
      <button
        onClick={onDiscard}
        className="flex-1 px-3 py-2 text-xs text-red-400/70 border border-[#1e1e2e] rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors"
      >
        Remove
      </button>
    </div>
  )
}

```

### components/inbox/inbox-event-card.tsx

```tsx
'use client'

import type { InboxEvent } from '@/types/inbox'
import { TimePill } from '@/components/common/time-pill'
import { COPY } from '@/lib/studio-copy'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface InboxEventCardProps {
  event: InboxEvent
}

const severityStyles: Record<InboxEvent['severity'], string> = {
  info: 'border-[#1e1e2e]',
  warning: 'border-amber-500/20',
  error: 'border-red-500/20',
  success: 'border-emerald-500/20',
}

const severityDot: Record<InboxEvent['severity'], string> = {
  info: 'bg-indigo-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  success: 'bg-emerald-500',
}

export function InboxEventCard({ event }: InboxEventCardProps) {
  const router = useRouter()
  const [isMarking, setIsMarking] = useState(false)

  const handleMarkRead = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isMarking || event.read) return

    setIsMarking(true)
    try {
      await fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id }),
      })
      router.refresh()
    } catch (err) {
      console.error('Failed to mark read:', err)
    } finally {
      setIsMarking(false)
    }
  }

  const content = (
    <div
      className={`bg-[#12121a] border rounded-xl p-4 transition-all ${severityStyles[event.severity]} ${
        !event.read ? 'border-l-4 border-l-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.05)]' : 'opacity-60'
      } hover:opacity-100 group`}
    >
      <div className="flex items-start gap-3">
        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityDot[event.severity]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-[#e2e8f0]">{event.title}</p>
            <div className="flex items-center gap-2">
              {!event.read && (
                <button
                  onClick={handleMarkRead}
                  disabled={isMarking}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#1e1e2e] rounded text-sky-400 transition-all"
                  title={COPY.inbox.markRead}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
              <TimePill dateString={event.timestamp} />
            </div>
          </div>
          <p className="text-xs text-[#94a3b8] leading-relaxed">{event.body}</p>
        </div>
      </div>
    </div>
  )

  if (event.actionUrl) {
    return (
      <Link href={event.actionUrl} className="block">
        {content}
      </Link>
    )
  }

  return content
}

```

### components/inbox/inbox-feed.tsx

```tsx
'use client'

import type { InboxEvent } from '@/types/inbox'
import { InboxEventCard } from './inbox-event-card'
import { useState } from 'react'
import { InboxFilterTabs } from './inbox-filter-tabs'

interface InboxFeedProps {
  events: InboxEvent[]
}

type Filter = 'all' | 'unread' | 'errors'

export function InboxFeed({ events }: InboxFeedProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = events.filter((e) => {
    if (filter === 'unread') return !e.read
    if (filter === 'errors') return e.severity === 'error'
    return true
  })

  return (
    <div className="space-y-4">
      <InboxFilterTabs
        filter={filter}
        onChange={setFilter}
        counts={{
          all: events.length,
          unread: events.filter((e) => !e.read).length,
          errors: events.filter((e) => e.severity === 'error').length,
        }}
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-[#94a3b8] text-center py-8">No events.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((event) => (
            <InboxEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

```

### components/inbox/inbox-filter-tabs.tsx

```tsx
import { COPY } from '@/lib/studio-copy'

type Filter = 'all' | 'unread' | 'errors'

interface InboxFilterTabsProps {
  filter: Filter
  onChange: (filter: Filter) => void
  counts?: {
    all: number
    unread: number
    errors: number
  }
}

export function InboxFilterTabs({ filter, onChange, counts }: InboxFilterTabsProps) {
  const tabs: { value: Filter; label: string }[] = [
    { value: 'all', label: `${COPY.inbox.filters.all}${counts ? ` (${counts.all})` : ''}` },
    { value: 'unread', label: `${COPY.inbox.filters.unread}${counts ? ` (${counts.unread})` : ''}` },
    { value: 'errors', label: `${COPY.inbox.filters.errors}${counts ? ` (${counts.errors})` : ''}` },
  ]

  return (
    <div className="flex gap-1 p-1 bg-[#12121a] border border-[#1e1e2e] rounded-lg w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            filter === tab.value
              ? 'bg-[#1e1e2e] text-[#e2e8f0]'
              : 'text-[#94a3b8] hover:text-[#e2e8f0]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

```

### components/knowledge/DomainCard.tsx

```tsx
'use client';

import React from 'react';

interface DomainCardProps {
  domain: string;
  unitCount: number;
  readCount: number;
  onClick?: () => void;
}

export default function DomainCard({ domain, unitCount, readCount, onClick }: DomainCardProps) {
  const progress = Math.round((readCount / unitCount) * 100);

  return (
    <div 
      onClick={onClick}
      className="flex flex-col p-5 bg-[#0d0d18] border border-[#1e1e2e] rounded-2xl hover:border-indigo-500/30 transition-all group cursor-pointer shadow-sm hover:shadow-indigo-500/5"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold text-[#f1f5f9] capitalize group-hover:text-indigo-300 transition-colors">
          {domain.replace(/-/g, ' ')}
        </h3>
        <div className="px-2 py-0.5 rounded bg-[#1e1e2e] text-[#94a3b8] text-[10px] font-bold uppercase tracking-tight border border-[#33334d]">
          {unitCount} {unitCount === 1 ? 'Unit' : 'Units'}
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a6a]">
            Progress
          </span>
          <span className="text-[10px] font-mono text-indigo-400">
            {progress}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-[#1e1e2e] rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

```

### components/knowledge/KnowledgeUnitCard.tsx

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { KnowledgeUnit } from '@/types/knowledge';
import { COPY } from '@/lib/studio-copy';
import { ROUTES } from '@/lib/routes';
import MasteryBadge from './MasteryBadge';

interface KnowledgeUnitCardProps {
  unit: KnowledgeUnit;
}

export default function KnowledgeUnitCard({ unit }: KnowledgeUnitCardProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'foundation':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'playbook':
        return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
      case 'deep_dive':
        return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'example':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'audio_script':
        return 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20';
      default:
        return 'text-[#94a3b8] bg-[#1e1e2e] border-[#1e1e2e]';
    }
  };

  return (
    <Link 
      href={ROUTES.knowledgeUnit(unit.id)}
      className="flex flex-col p-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-indigo-500/5 h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getTypeColor(unit.unit_type)}`}>
          {unit.unit_type === 'audio_script' ? '🎙️ ' : ''}{COPY.knowledge.unitTypes[unit.unit_type as keyof typeof COPY.knowledge.unitTypes]}
        </div>
        <MasteryBadge status={unit.mastery_status} />
      </div>

      <h3 className="text-base font-bold text-[#f1f5f9] mb-2 group-hover:text-indigo-300 transition-colors line-clamp-1">
        {unit.title}
      </h3>
      
      <p className="text-xs text-[#94a3b8] line-clamp-1 mb-4">
        {unit.thesis}
      </p>

      <div className="mt-auto pt-2 flex items-center text-[10px] font-bold uppercase tracking-widest text-[#4a4a6a] group-hover:text-indigo-400/70 transition-colors">
        Learn about this →
      </div>
    </Link>
  );
}

```

### components/knowledge/KnowledgeUnitView.tsx

```tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { KnowledgeUnit, MasteryStatus } from '@/types/knowledge';
import { COPY } from '@/lib/studio-copy';
import { ROUTES } from '@/lib/routes';
import MasteryBadge from './MasteryBadge';

interface KnowledgeUnitViewProps {
  unit: KnowledgeUnit;
  practiceCount: number;
}

type Tab = 'learn' | 'practice' | 'links';

export default function KnowledgeUnitView({ unit, practiceCount: initialPracticeCount }: KnowledgeUnitViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('learn');
  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localPracticeCount, setLocalPracticeCount] = useState(initialPracticeCount);

  const handlePracticeAttempt = async (correct: boolean) => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/knowledge/${unit.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correct, userId: unit.user_id }),
      });

      if (res.ok) {
        if (correct) setLocalPracticeCount(prev => prev + 1);
        router.refresh(); // Sync mastery status from server
      }
    } catch (err) {
      console.error('Failed to record practice:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const updateMastery = async (status: MasteryStatus) => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/knowledge/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mastery_status: status }),
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to update mastery:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'foundation': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'playbook': return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
      case 'deep_dive': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'example': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'misconception': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-[#94a3b8] bg-[#1e1e2e] border-[#1e1e2e]';
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 md:px-0">
      <Link 
        href={ROUTES.knowledge}
        className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-[#4a4a6a] hover:text-indigo-400 mb-8 transition-colors"
      >
        ← Back to Knowledge
      </Link>

      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getTypeColor(unit.unit_type)}`}>
            {COPY.knowledge.unitTypes[unit.unit_type]}
          </div>
          <MasteryBadge status={unit.mastery_status} />
          <span className="text-[10px] uppercase tracking-widest text-[#4a4a6a] font-bold">
            {unit.domain.replace(/-/g, ' ')}
          </span>
        </div>
        <h1 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight">{unit.title}</h1>
      </header>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-[#1e1e2e] mb-8">
          {(['learn', 'practice', 'links'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all relative ${
                activeTab === tab ? 'text-indigo-400' : 'text-[#4a4a6a] hover:text-[#94a3b8]'
              }`}
            >
              <div className="flex items-center gap-2">
                {tab}
                {tab === 'practice' && localPracticeCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] rounded-md border border-amber-500/20">
                    Practiced {localPracticeCount}x
                  </span>
                )}
              </div>
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
              )}
            </button>
          ))}
        </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'learn' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Quick Read Callout */}
            <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-3">Thesis</h3>
              <div className="text-xl text-[#f1f5f9] font-medium leading-relaxed italic prose prose-invert max-w-none">
                <ReactMarkdown>{unit.thesis}</ReactMarkdown>
              </div>
            </div>

            {/* Deep Read Body */}
            <div className="prose prose-invert prose-indigo max-w-none prose-p:leading-relaxed prose-p:text-base prose-headings:mb-4 prose-headings:mt-8">
              <ReactMarkdown>{unit.content}</ReactMarkdown>
            </div>

            {/* Key Ideas */}
            {unit.key_ideas.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-[#f1f5f9] mb-4">Key Ideas</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {unit.key_ideas.map((idea, i) => (
                    <li key={i} className="p-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl text-sm text-[#94a3b8] flex items-start">
                      <span className="text-indigo-400 mr-3 mt-1 leading-none">•</span>
                      {idea}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Common Mistake */}
            {unit.common_mistake && (
              <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-500 text-lg">⚠️</span>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500">Common Mistake</h3>
                </div>
                <p className="text-sm text-[#e2e8f0] leading-relaxed italic">
                  {unit.common_mistake}
                </p>
              </div>
            )}

            {/* Action Prompt */}
            {unit.action_prompt && (
              <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-emerald-500 text-lg">⚡</span>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500">Action Prompt</h3>
                </div>
                <p className="text-[#f1f5f9] font-semibold">
                  {unit.action_prompt}
                </p>
              </div>
            )}

            {/* Citations */}
            {unit.citations.length > 0 && (
              <section className="pt-8 border-t border-[#1e1e2e]">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a6a] mb-4">Citations & Proof</h2>
                <div className="space-y-3">
                  {unit.citations.map((cite, i) => (
                    <a 
                      key={i} 
                      href={cite.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-4 border border-[#1e1e2e] rounded-xl hover:bg-[#12121e] transition-colors group"
                    >
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-[#94a3b8] group-hover:text-[#e2e8f0] transition-colors line-clamp-1">
                          {cite.claim}
                        </p>
                        <span className="text-[10px] text-indigo-400 font-mono">
                          {Math.round(cite.confidence * 100)}% Match
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'practice' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {unit.retrieval_questions.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-4">
                  {unit.retrieval_questions.map((q, i) => (
                    <div 
                      key={i} 
                      className="bg-[#0d0d18] border border-[#1e1e2e] rounded-xl overflow-hidden"
                    >
                      <button 
                        onClick={() => toggleQuestion(i)}
                        className="w-full p-5 text-left flex justify-between items-center hover:bg-[#12121e] transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className={`text-[9px] font-bold uppercase tracking-tighter mb-1 ${
                            q.difficulty === 'easy' ? 'text-emerald-400' : 
                            q.difficulty === 'medium' ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {q.difficulty}
                          </span>
                          <span className="text-sm font-bold text-[#f1f5f9]">{q.question}</span>
                        </div>
                        <span className={`text-[#4a4a6a] transition-transform duration-300 ${expandedQuestions.includes(i) ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </button>
                      {expandedQuestions.includes(i) && (
                        <div className="px-5 pb-5 pt-2 border-t border-[#1e1e2e] animate-in slide-in-from-top-1 duration-200">
                          <p className="text-sm text-[#94a3b8] leading-relaxed mb-6">
                            {q.answer}
                          </p>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-[#1e1e2e]/50">
                            <span className="text-[10px] font-bold text-[#4a4a6a] uppercase">Did you get this right?</span>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handlePracticeAttempt(false)}
                                className="px-3 py-1.5 rounded-lg border border-rose-500/20 text-rose-500 text-[10px] font-bold hover:bg-rose-500/10 transition-colors"
                              >
                                Not Yet
                              </button>
                              <button 
                                onClick={() => handlePracticeAttempt(true)}
                                className="px-4 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold hover:bg-emerald-500/20 transition-colors"
                              >
                                Yes
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="pt-10 flex flex-col items-center">
                  <p className="text-xs text-[#4a4a6a] mb-4 text-center">
                    Attempting these retrieval questions solidifies memory.
                  </p>
                  <button 
                    onClick={() => updateMastery('practiced')}
                    disabled={isUpdating}
                    className="px-6 py-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-amber-500/20 transition-all disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : COPY.knowledge.actions.markPracticed}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-[#4a4a6a]">
                <p>No practice questions for this unit.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'links' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Related Experiences */}
            {unit.linked_experience_ids.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-[#f1f5f9] mb-6">Active Context</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unit.linked_experience_ids.map((id) => (
                    <Link 
                      key={id}
                      href={ROUTES.workspace(id)}
                      className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl hover:bg-indigo-500/10 transition-colors group"
                    >
                      <h4 className="text-sm font-bold text-[#e2e8f0] mb-2 group-hover:text-indigo-300">Continue Related Journey</h4>
                      <p className="text-[10px] uppercase tracking-widest text-[#4a4a6a] font-bold">Go to Workspace →</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Subtopic Seeds */}
            {unit.subtopic_seeds.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-[#f1f5f9] mb-4">Explore Next</h2>
                <div className="flex flex-wrap gap-2">
                  {unit.subtopic_seeds.map((seed, i) => (
                    <span 
                      key={i} 
                      className="px-3 py-1.5 bg-[#0d0d18] border border-[#1e1e2e] rounded-full text-xs text-[#94a3b8] font-medium"
                    >
                      {seed}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs text-[#4a4a6a]">
                  These topics have been identified by Mira as your next logical research horizons.
                </p>
              </section>
            )}

            {/* Source Experience Link */}
            {unit.source_experience_id && (
              <section className="p-6 bg-[#00000022] border border-dashed border-[#1e1e2e] rounded-2xl">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#4a4a6a] mb-2">Genesis</h4>
                <p className="text-sm text-[#94a3b8] mb-4">
                  This knowledge unit was synthesized from your participation in an experience.
                </p>
                <Link 
                  href={ROUTES.workspace(unit.source_experience_id)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
                >
                  View Source Experience →
                </Link>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Persistent Mastery Controls */}
      <footer className="mt-20 pt-10 border-t border-[#1e1e2e] flex flex-wrap justify-center gap-4">
        {unit.mastery_status !== 'read' && (
          <button 
            onClick={() => updateMastery('read')}
            disabled={isUpdating}
            className="px-6 py-3 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-sky-500/20 transition-all disabled:opacity-50"
          >
            {COPY.knowledge.actions.markRead}
          </button>
        )}
        {unit.mastery_status !== 'practiced' && (
          <button 
            onClick={() => updateMastery('practiced')}
            disabled={isUpdating}
            className="px-6 py-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-500/20 transition-all disabled:opacity-50"
          >
            {COPY.knowledge.actions.markPracticed}
          </button>
        )}
        {unit.mastery_status !== 'confident' && (
          <button 
            onClick={() => updateMastery('confident')}
            disabled={isUpdating}
            className="px-6 py-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all disabled:opacity-50"
          >
            {COPY.knowledge.actions.markConfident}
          </button>
        )}
      </footer>
    </div>
  );
}

```

### components/knowledge/MasteryBadge.tsx

```tsx
'use client';

import React from 'react';
import { MasteryStatus } from '@/types/knowledge';
import { COPY } from '@/lib/studio-copy';

interface MasteryBadgeProps {
  status: MasteryStatus;
  className?: string;
}

export default function MasteryBadge({ status, className = '' }: MasteryBadgeProps) {
  const getStatusStyles = (status: MasteryStatus) => {
    switch (status) {
      case 'unseen':
        return 'bg-[#1e1e2e] text-[#4a4a6a] border-[#1e1e2e]';
      case 'read':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'practiced':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'confident':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-[#1e1e2e] text-[#4a4a6a] border-[#1e1e2e]';
    }
  };

  return (
    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getStatusStyles(status)} ${className}`}>
      {COPY.knowledge.mastery[status]}
    </div>
  );
}

```

### components/layout/slide-out-drawer.tsx

```tsx
'use client'

import { useState, useEffect } from 'react'
import { ThinkNodeDrawer } from '@/components/drawers/think-node-drawer'

export interface DrawerContent {
  type: 'think_node' | 'generic'
  data: any
}

export function SlideOutDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState<DrawerContent | null>(null)

  useEffect(() => {
    const handleOpen = (e: any) => {
      setContent(e.detail)
      setIsOpen(true)
    }

    const handleClose = () => {
      setIsOpen(false)
      setTimeout(() => setContent(null), 300) // Clear after animation
    }

    window.addEventListener('open-drawer' as any, handleOpen)
    window.addEventListener('close-drawer' as any, handleClose)

    return () => {
      window.removeEventListener('open-drawer' as any, handleOpen)
      window.removeEventListener('close-drawer' as any, handleClose)
    }
  }, [])

  if (!content && !isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full max-w-sm bg-[#12121a] border-l border-[#1e1e2e] shadow-2xl z-50 transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
          {/* Drawer content types will be added here */}
          {content?.type === 'generic' && (
            <div>Generic drawer content not implemented</div>
          )}
        </div>
      </div>
    </>
  )
}

export function openDrawer(content: DrawerContent) {
  const event = new CustomEvent('open-drawer', { detail: content })
  window.dispatchEvent(event)
}

export function closeDrawer() {
  const event = new CustomEvent('close-drawer')
  window.dispatchEvent(event)
}

```

### components/memory/MemoryEntryCard.tsx

```tsx
'use client'

import { useState } from 'react'
import { AgentMemoryEntry, MemoryEntryKind } from '@/types/agent-memory'
import { COPY } from '@/lib/studio-copy'
import { formatDistanceToNow } from 'date-fns'

interface MemoryEntryCardProps {
  entry: AgentMemoryEntry
  onUpdate: (id: string, updates: Partial<AgentMemoryEntry>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const KIND_COLORS: Record<MemoryEntryKind, string> = {
  observation: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  strategy: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  idea: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  preference: 'bg-green-500/10 text-green-400 border-green-500/20',
  tactic: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  assessment: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  note: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

export function MemoryEntryCard({ entry, onUpdate, onDelete }: MemoryEntryCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(entry.content)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (editContent === entry.content) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onUpdate(entry.id, { content: editContent })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTogglePin = async () => {
    await onUpdate(entry.id, { pinned: !entry.pinned })
  }

  return (
    <div className={`group relative p-4 rounded-xl border bg-[#12121a] transition-all hover:border-[#1e1e2e] ${entry.pinned ? 'border-amber-500/30' : 'border-transparent'}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${KIND_COLORS[entry.kind]}`}>
            {COPY.memory.kinds[entry.kind]}
          </span>
          {entry.pinned && (
            <span className="text-amber-500 text-xs">★</span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={handleTogglePin}
            className={`p-1.5 rounded hover:bg-[#1e1e2e] transition-colors ${entry.pinned ? 'text-amber-500' : 'text-[#94a3b8]'}`}
            title={entry.pinned ? COPY.memory.actions.unpin : COPY.memory.actions.pin}
          >
            {entry.pinned ? '★' : '☆'}
          </button>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded hover:bg-[#1e1e2e] text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
              title={COPY.memory.actions.edit}
            >
              ✎
            </button>
          )}
          <button 
            onClick={() => setIsDeleting(true)}
            className="p-1.5 rounded hover:bg-red-500/10 text-[#94a3b8] hover:text-red-400 transition-colors"
            title={COPY.memory.actions.delete}
          >
            ×
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-3 text-sm text-[#e2e8f0] focus:ring-1 focus:ring-[#6366f1] focus:border-[#6366f1] outline-none min-h-[80px]"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setIsEditing(false); setEditContent(entry.content); }}
              className="px-3 py-1.5 rounded text-xs text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
              disabled={isSaving}
            >
              {COPY.common.cancel}
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded text-xs bg-[#6366f1] text-[#fff] hover:bg-[#4f46e5] disabled:opacity-50 transition-colors"
              disabled={isSaving}
            >
              {isSaving ? COPY.common.loading : COPY.common.save}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#e2e8f0] leading-relaxed mb-4 whitespace-pre-wrap">
          {entry.content}
        </p>
      )}

      <div className="flex items-center gap-4 text-[10px] text-[#64748b]">
        <div className="flex items-center gap-1">
          <span className="font-semibold">Used:</span>
          <span>{entry.usageCount}x</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold">Confidence:</span>
          <div className="w-12 h-1 bg-[#1e1e2e] rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all" 
              style={{ width: `${(entry.confidence || 0.6) * 100}%` }}
            />
          </div>
        </div>
        <div className="ml-auto">
          {entry.lastUsedAt && (
            <span>Last used {formatDistanceToNow(new Date(entry.lastUsedAt))} ago</span>
          )}
        </div>
      </div>

      {isDeleting && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 rounded-xl bg-[#0a0a0f]/95 border border-red-500/50 backdrop-blur-sm">
          <p className="text-sm font-medium text-[#e2e8f0] mb-4 text-center">
            {COPY.memory.confirmDelete}
          </p>
          <div className="flex gap-2 w-full max-w-[200px]">
            <button
              onClick={() => setIsDeleting(false)}
              className="flex-1 px-4 py-2 rounded-lg bg-[#1e1e2e] text-[#e2e8f0] text-xs hover:bg-[#2e2e3e] transition-colors"
            >
              {COPY.common.cancel}
            </button>
            <button
              onClick={() => onDelete(entry.id)}
              className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs border border-red-500/30 hover:bg-red-500/30 transition-colors"
            >
              {COPY.memory.actions.delete}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

```

### components/memory/MemoryExplorer.tsx

```tsx
'use client'

import { useState } from 'react'
import { AgentMemoryEntry } from '@/types/agent-memory'
import { MemoryEntryCard } from './MemoryEntryCard'
import { COPY } from '@/lib/studio-copy'

interface MemoryExplorerProps {
  initialGroupedMemories: Record<string, AgentMemoryEntry[]>
  userId: string
}

export function MemoryExplorer({ initialGroupedMemories, userId }: MemoryExplorerProps) {
  const [groupedMemories, setGroupedMemories] = useState(initialGroupedMemories)
  const [expandedTopics, setExpandedTopics] = useState<string[]>(Object.keys(initialGroupedMemories))

  const toggleTopic = (topic: string) => {
    setExpandedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    )
  }

  const handleUpdate = async (id: string, updates: Partial<AgentMemoryEntry>) => {
    // Optimistic update
    const newGrouped = { ...groupedMemories }
    let updatedEntry: AgentMemoryEntry | null = null
    
    for (const topic in newGrouped) {
      const idx = newGrouped[topic].findIndex((e) => e.id === id)
      if (idx !== -1) {
        newGrouped[topic][idx] = { ...newGrouped[topic][idx], ...updates }
        updatedEntry = newGrouped[topic][idx]
        break
      }
    }
    
    setGroupedMemories({ ...newGrouped })

    // Call API
    try {
      const res = await fetch(`/api/gpt/memory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Update failed')
    } catch (err) {
      console.error('[MemoryExplorer] Update failed:', err)
      // Note: In production you'd want to rollback state here
    }
  }

  const handleDelete = async (id: string) => {
    const newGrouped = { ...groupedMemories }
    for (const topic in newGrouped) {
      const idx = newGrouped[topic].findIndex((e) => e.id === id)
      if (idx !== -1) {
        newGrouped[topic].splice(idx, 1)
        if (newGrouped[topic].length === 0) delete newGrouped[topic]
        break
      }
    }
    setGroupedMemories({ ...newGrouped })

    try {
      const res = await fetch(`/api/gpt/memory/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    } catch (err) {
      console.error('[MemoryExplorer] Delete failed:', err)
    }
  }

  if (Object.keys(groupedMemories).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in duration-700">
        <div className="w-16 h-16 rounded-full bg-[#12121a] flex items-center justify-center border border-[#1e1e2e] mb-6 text-2xl shadow-xl">
          🧠
        </div>
        <h3 className="text-[#f1f5f9] font-medium mb-2">{COPY.memory.heading}</h3>
        <p className="text-[#94a3b8] text-sm max-w-sm leading-relaxed">
          {COPY.memory.emptyState}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {Object.entries(groupedMemories)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([topic, entries]) => (
          <section key={topic} className="space-y-6">
            <button
              onClick={() => toggleTopic(topic)}
              className="flex items-center gap-4 group w-full text-left"
            >
              <div className="flex items-center gap-3">
                <span className={`text-[10px] text-[#475569] transition-transform duration-300 ${expandedTopics.includes(topic) ? 'rotate-90' : ''}`}>
                  ▶
                </span>
                <h3 className="text-xs font-bold text-[#94a3b8] tracking-[0.2em] uppercase group-hover:text-[#e2e8f0] transition-colors">
                  {topic}
                </h3>
              </div>
              <div className="h-px flex-1 bg-[#1e1e2e]" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#64748b] bg-[#12121a] px-2 py-0.5 rounded border border-[#1e1e2e]">
                  {entries.length} units
                </span>
              </div>
            </button>

            {expandedTopics.includes(topic) && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-in fade-in slide-in-from-top-2 duration-500">
                {entries
                  .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
                  .map((entry) => (
                    <MemoryEntryCard
                      key={entry.id}
                      entry={entry}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
              </div>
            )}
          </section>
        ))}
    </div>
  )
}

```

### components/profile/DirectionSummary.tsx

```tsx
// components/profile/DirectionSummary.tsx
'use client'

import { UserProfile } from '@/types/profile'
import { Goal } from '@/types/goal'
import { SkillDomain } from '@/types/skill'
import { formatDate } from '@/lib/date'
import { StatusBadge } from '@/components/common/status-badge'

interface DirectionSummaryProps {
  profile: UserProfile
  activeGoal: Goal | null
  skillDomains: SkillDomain[]
}

export function DirectionSummary({ profile, activeGoal, skillDomains }: DirectionSummaryProps) {
  const hasFacets = profile.facets.length > 0

  const strongestDomain = skillDomains.reduce((prev, current) => 
    (current.evidenceCount > (prev?.evidenceCount || 0)) ? current : prev, 
    null as SkillDomain | null
  )

  const emergingPattern = profile.facets.find(f => f.facet_type === 'preferred_mode' && f.confidence > 0.6)?.value

  if (!hasFacets) {
    return (
      <div className="p-8 rounded-xl border border-dashed border-slate-700/50 bg-slate-900/10 text-center flex flex-col items-center gap-4">
        <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-400">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-medium text-slate-200">Building Your Direction</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2">
            Your profile builds automatically as you complete experiences. Complete your first journey to see compiled intelligence here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Overview Card */}
      <div className="col-span-1 p-6 rounded-2xl border border-slate-700/50 bg-slate-900/40 shadow-xl flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400">
              {profile.displayName}
            </h2>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mt-1">
              Building since {formatDate(profile.memberSince)}
            </p>
          </div>
          <StatusBadge status="active" />
        </div>

        <div className="space-y-4 mt-2">
          {activeGoal ? (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 group transition-all hover:bg-amber-500/10">
               <span className="text-[10px] text-amber-500 uppercase font-black tracking-[0.2em] mb-1 block">Active Trajectory</span>
               <span className="text-sm font-bold text-slate-200 block truncate">{activeGoal.title}</span>
               <div className="flex items-center gap-2 mt-2">
                 <div className="flex-1 h-1 bg-amber-500/10 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                     style={{ width: `${Math.min(100, (profile.experienceCount.completed / 10) * 100)}%` }} 
                   />
                 </div>
                 <span className="text-[10px] font-mono text-amber-500/60 uppercase">{activeGoal.status}</span>
               </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-800/10 border border-slate-700/50 border-dashed text-center italic">
              <span className="text-xs text-slate-500">Pick a goal to track trajectory</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
             <StatMini label="Strongest" value={strongestDomain?.name || '---'} color="text-indigo-400" />
             <StatMini label="Flow Mode" value={emergingPattern || '---'} color="text-rose-400" />
          </div>
        </div>
      </div>

      {/* Intelligence Insights Card */}
      <div className="col-span-1 md:col-span-2 p-6 rounded-2xl border border-slate-700/50 bg-slate-900/40 shadow-xl flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-indigo-500 rounded-full" />
              <h3 className="text-xs uppercase tracking-[0.2em] font-black text-slate-400">Core Interests</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.topInterests.length > 0 ? (
                profile.topInterests.map(interest => (
                  <span key={interest} className="px-2.5 py-1 bg-white/5 text-slate-200 border border-white/5 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors cursor-default">
                    {interest}
                  </span>
                ))
              ) : (
                <span className="text-slate-600 italic text-xs">Awaiting signal...</span>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-emerald-500 rounded-full" />
              <h3 className="text-xs uppercase tracking-[0.2em] font-black text-slate-400">Primary Skills</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.topSkills.length > 0 ? (
                profile.topSkills.map(skill => (
                  <span key={skill} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/10 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-colors cursor-default">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-slate-600 italic text-xs">Awaiting evidence...</span>
              )}
            </div>
          </section>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
          <div className="flex gap-4">
             <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Time Lived</span>
                <span className="text-lg font-black text-white">~{((profile.experienceCount.completed * 45) / 60).toFixed(1)}<span className="text-xs font-normal text-slate-400 ml-1">hours</span></span>
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Momentum</span>
                <span className="text-lg font-black text-white">{profile.experienceCount.completionRate.toFixed(0)}%</span>
             </div>
          </div>
          <div className="text-right">
             <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] block mb-1">Intelligence Layer</span>
             <span className="text-xs text-slate-500 italic">v1.2 Studio Core</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 bg-white/5 rounded-xl border border-white/5 group">
      <span className="block text-[9px] uppercase tracking-widest font-black text-slate-500 mb-1">{label}</span>
      <span className={`block text-xs font-bold truncate ${color}`}>{value}</span>
    </div>
  )
}

```

### components/profile/FacetCard.tsx

```tsx
// components/profile/FacetCard.tsx
'use client'

import { ProfileFacet } from '@/types/profile'

interface FacetCardProps {
  facet: ProfileFacet
}

const TYPE_COLORS: Record<string, string> = {
  interest: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  skill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  goal: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  effort_area: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  preferred_depth: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  preferred_mode: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

export function FacetCard({ facet }: FacetCardProps) {
  const isStrongSignal = facet.confidence > 0.8
  const colorClass = TYPE_COLORS[facet.facet_type] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'

  return (
    <div className={`p-4 rounded-xl border-2 ${colorClass} flex flex-col gap-3 relative overflow-hidden group transition-all hover:bg-opacity-20 animate-in fade-in slide-in-from-bottom-2`}>
      <div className="flex justify-between items-start">
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">
          {facet.facet_type.replace('_', ' ')}
        </span>
        {isStrongSignal && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-current text-slate-900 font-black uppercase tracking-tighter shadow-sm">
            Strong Signal
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        <span className="text-xl font-bold leading-tight block">
          {facet.value}
        </span>
        {facet.evidence && (
          <p className="text-[11px] leading-relaxed opacity-70 line-clamp-2 italic">
            "{facet.evidence}"
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between pt-2">
         <div className="flex gap-0.5" title={`${(facet.confidence * 100).toFixed(0)}% confidence`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i <= Math.round(facet.confidence * 5) ? 'bg-current' : 'bg-current/10'}`}
              />
            ))}
         </div>
         {facet.source_snapshot_id && (
           <span className="text-[9px] font-mono opacity-40 uppercase">
             Ref: {facet.source_snapshot_id.slice(0, 4)}
           </span>
         )}
      </div>

      {/* Confidence Bar background */}
      <div className="absolute bottom-0 left-0 h-1 bg-current opacity-5 w-full" />
      <div 
        className="absolute bottom-0 left-0 h-1 bg-current transition-all duration-700 delay-100 ease-out" 
        style={{ width: `${facet.confidence * 100}%` }} 
      />
    </div>
  )
}

```

### components/profile/SkillTrajectory.tsx

```tsx
// components/profile/SkillTrajectory.tsx
import { SkillDomain } from '@/types/skill'
import { MASTERY_THRESHOLDS, SkillMasteryLevel } from '@/lib/constants'

interface SkillTrajectoryProps {
  domains: SkillDomain[]
}

const LEVEL_COLORS: Record<SkillMasteryLevel, string> = {
  undiscovered: 'text-slate-400 bg-slate-400',
  aware: 'text-sky-400 bg-sky-500',
  beginner: 'text-amber-400 bg-amber-500',
  practicing: 'text-emerald-400 bg-emerald-500',
  proficient: 'text-indigo-400 bg-indigo-500',
  expert: 'text-purple-400 bg-purple-500',
}

export function SkillTrajectory({ domains }: SkillTrajectoryProps) {
  if (domains.length === 0) {
    return <p className="text-slate-500 italic pb-4">No skill domains linked to this goal yet.</p>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
      {domains.map(domain => {
        const levels: SkillMasteryLevel[] = ['undiscovered', 'aware', 'beginner', 'practicing', 'proficient', 'expert']
        const currentIndex = levels.indexOf(domain.masteryLevel)
        const nextLevel = levels[currentIndex + 1]
        
        // Use next threshold for bar progress, or current if expert
        const targetThreshold = nextLevel ? MASTERY_THRESHOLDS[nextLevel] : MASTERY_THRESHOLDS['expert']
        const progressPercent = Math.min(100, (domain.evidenceCount / targetThreshold) * 100)
        
        const colors = LEVEL_COLORS[domain.masteryLevel]
        const [textColor, bgColor] = colors.split(' ')

        return (
          <div key={domain.id} className="group">
            <div className="flex justify-between items-end mb-2">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-slate-200 font-medium group-hover:text-white transition-colors truncate">
                  {domain.name}
                </h3>
                {domain.description && (
                  <p className="text-xs text-slate-500 truncate" title={domain.description}>
                    {domain.description}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-opacity-10 border border-current ${textColor}`}>
                  {domain.masteryLevel}
                </span>
                <div className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">
                  {domain.evidenceCount} / {targetThreshold} Evidence
                </div>
              </div>
            </div>
            <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5 relative">
              <div 
                className={`h-full transition-all duration-700 ease-out ${bgColor}`}
                style={{ width: `${progressPercent}%` }}
              />
              {/* Threshold markers */}
              <div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-20">
                {[0.25, 0.5, 0.75].map(tick => (
                  <div key={tick} className="h-full w-px bg-white" style={{ left: `${tick * 100}%` }} />
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

```

### components/review/build-status-chip.tsx

```tsx
import type { PullRequest } from '@/types/pr'

interface BuildStatusChipProps {
  state: PullRequest['buildState']
}

const stateConfig: Record<PullRequest['buildState'], { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20' },
  running: { label: 'Building…', className: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' },
  success: { label: 'Build passed', className: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' },
  failed: { label: 'Build failed', className: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20' },
}

export function BuildStatusChip({ state }: BuildStatusChipProps) {
  const config = stateConfig[state]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

```

### components/review/diff-summary.tsx

```tsx
export function DiffSummary() {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">
        Changes
      </h3>
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-400">+24</span>
          <span className="text-red-400">-8</span>
          <span className="text-[#94a3b8]">3 files changed</span>
        </div>
        <p className="text-xs text-[#94a3b8]">
          Diff details will appear here when connected to GitHub.
        </p>
      </div>
    </div>
  )
}

```

### components/review/fix-request-box.tsx

```tsx
'use client'

import { useState } from 'react'

interface FixRequestBoxProps {
  prId: string
  existingRequest?: string
}

export function FixRequestBox({ prId, existingRequest }: FixRequestBoxProps) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedText, setSubmittedText] = useState(existingRequest ?? '')
  const [error, setError] = useState<string | null>(null)

  // If there's already a requested change, show it as submitted
  if (submittedText && (submitted || existingRequest)) {
    return (
      <div className="bg-[#12121a] border border-amber-500/20 rounded-xl p-4">
        <h3 className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-2">
          Changes Requested
        </h3>
        <p className="text-sm text-[#e2e8f0] leading-relaxed">{submittedText}</p>
      </div>
    )
  }

  async function handleSubmit() {
    if (!value.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/prs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prId, requestedChanges: value.trim(), reviewStatus: 'changes_requested' }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to submit request')
      } else {
        setSubmittedText(value.trim())
        setSubmitted(true)
        setValue('')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
      <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">
        Request Changes
      </h3>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe what needs to change…"
        rows={3}
        className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#94a3b8]/50 resize-none focus:outline-none focus:border-indigo-500/40 transition-colors"
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || submitting}
        className="mt-2 px-4 py-2 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Sending…' : 'Send fix request'}
      </button>
    </div>
  )
}

```

### components/review/merge-actions.tsx

```tsx
'use client'

import { useState } from 'react'
import type { ReviewStatus } from '@/types/pr'

interface MergeActionsProps {
  prId: string
  canMerge: boolean
  currentStatus: string
  reviewState: ReviewStatus
}

export function MergeActions({ prId, canMerge, currentStatus, reviewState }: MergeActionsProps) {
  const [merging, setMerging] = useState(false)
  const [approving, setApproving] = useState(false)
  const [localReviewState, setLocalReviewState] = useState<ReviewStatus>(reviewState)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [merged, setMerged] = useState(currentStatus === 'merged')

  const reviewStateLabels: Record<ReviewStatus, { label: string; color: string }> = {
    pending: { label: 'Pending Review', color: 'text-[#94a3b8]' },
    approved: { label: 'Approved', color: 'text-emerald-400' },
    changes_requested: { label: 'Changes Requested', color: 'text-amber-400' },
    merged: { label: 'Merged', color: 'text-indigo-400' },
  }

  const stateInfo = reviewStateLabels[merged ? 'merged' : localReviewState]

  async function handleApprove() {
    if (approving || localReviewState === 'approved') return
    setApproving(true)
    try {
      const res = await fetch('/api/prs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prId, reviewStatus: 'approved' }),
      })
      if (res.ok) {
        setLocalReviewState('approved')
      }
    } catch {
      // silently fail — local dev
    } finally {
      setApproving(false)
    }
  }

  async function handleMerge() {
    if (!canMerge || merging || merged) return
    setMerging(true)
    setMergeError(null)
    try {
      const res = await fetch('/api/actions/merge-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMergeError(json.error ?? 'Merge failed')
      } else {
        setMerged(true)
        setLocalReviewState('merged')
      }
    } catch {
      setMergeError('Network error. Please try again.')
    } finally {
      setMerging(false)
    }
  }

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 space-y-4">
      {/* Review status indicator */}
      <div>
        <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-2">Review Status</p>
        <span className={`text-sm font-medium ${stateInfo.color}`}>
          {stateInfo.label}
        </span>
      </div>

      <div className="space-y-2">
        {/* Approve button */}
        {!merged && (
          <button
            onClick={handleApprove}
            disabled={approving || localReviewState === 'approved'}
            className="w-full px-4 py-2.5 text-sm font-medium bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {approving ? 'Approving…' : localReviewState === 'approved' ? 'Approved ✓' : 'Approve'}
          </button>
        )}

        {/* Merge button */}
        <button
          onClick={handleMerge}
          disabled={!canMerge || merging || merged}
          className="w-full px-4 py-2.5 text-sm font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {merging ? 'Merging…' : merged ? 'Merged ✓' : 'Merge PR'}
        </button>

        {mergeError && (
          <p className="text-xs text-red-400 mt-1">{mergeError}</p>
        )}
      </div>
    </div>
  )
}

```

### components/review/preview-toolbar.tsx

```tsx
interface PreviewToolbarProps {
  url: string
}

export function PreviewToolbar({ url }: PreviewToolbarProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[#12121a] border border-[#1e1e2e] rounded-xl">
      <span className="text-xs text-[#94a3b8] truncate flex-1 font-mono">{url}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-sky-400 hover:text-sky-300 flex-shrink-0 transition-colors"
      >
        ↗ Open
      </a>
    </div>
  )
}

```

### components/review/pr-summary-card.tsx

```tsx
import type { PullRequest } from '@/types/pr'
import { TimePill } from '@/components/common/time-pill'

interface PRSummaryCardProps {
  pr: PullRequest
}

export function PRSummaryCard({ pr }: PRSummaryCardProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-xs text-[#94a3b8]">PR #{pr.number}</span>
          <h3 className="font-semibold text-[#e2e8f0] mt-0.5">{pr.title}</h3>
        </div>
        <TimePill dateString={pr.createdAt} />
      </div>
      <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
        <span className="px-2 py-0.5 bg-[#1e1e2e] rounded font-mono">{pr.branch}</span>
        <span>by {pr.author}</span>
      </div>
    </div>
  )
}

```

### components/review/split-review-layout.tsx

```tsx
import React from 'react'

interface ReviewLayoutProps {
  breadcrumb: React.ReactNode
  preview: React.ReactNode
  sidebar: React.ReactNode
}

export function SplitReviewLayout({ breadcrumb, preview, sidebar }: ReviewLayoutProps) {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Breadcrumb */}
      <div>{breadcrumb}</div>

      {/* Main content: preview hero + sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Preview — ~65% width on desktop, full width on mobile */}
        <div className="w-full lg:w-[65%] flex-shrink-0">
          {preview}
        </div>

        {/* Sidebar — ~35% width on desktop, full width on mobile */}
        <div className="w-full lg:w-[35%] flex flex-col gap-4">
          {sidebar}
        </div>
      </div>
    </div>
  )
}

```

### components/send/captured-idea-card.tsx

```tsx
'use client'

import type { Idea } from '@/types/idea'
import { TimePill } from '@/components/common/time-pill'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

interface CapturedIdeaCardProps {
  idea: Idea
  onHold?: (ideaId: string) => void
  onRemove?: (ideaId: string) => void
}

export function CapturedIdeaCard({ idea, onHold, onRemove }: CapturedIdeaCardProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden">
      <div className="p-6">
        {/* Header: title + timestamp */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="text-xl font-bold text-[#e2e8f0] leading-snug">{idea.title}</h2>
          <TimePill dateString={idea.created_at} />
        </div>

        {/* GPT Summary */}
        <p className="text-sm text-[#cbd5e1] mb-4 leading-relaxed">{idea.gptSummary}</p>

        {/* Raw prompt as blockquote */}
        {idea.rawPrompt && (
          <blockquote className="border-l-2 border-[#2e2e42] pl-3 mb-4">
            <p className="text-xs text-[#64748b] italic leading-relaxed">&ldquo;{idea.rawPrompt}&rdquo;</p>
          </blockquote>
        )}

        {/* Vibe + Audience chips */}
        <div className="flex flex-wrap gap-2 mb-2">
          {idea.vibe && (
            <span className="px-2 py-1 text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
              {idea.vibe}
            </span>
          )}
          {idea.audience && (
            <span className="px-2 py-1 text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
              for: {idea.audience}
            </span>
          )}
        </div>
      </div>

      {/* Next action label */}
      <div className="px-6 py-2 bg-[#0a0a10] border-t border-[#1e1e2e]">
        <span className="text-xs text-indigo-400 font-medium tracking-wide uppercase">Next: Define this idea →</span>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-[#1e1e2e] flex flex-col gap-2">
        <Link
          href={`${ROUTES.drill}?ideaId=${idea.id}`}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm font-semibold hover:bg-indigo-500/30 transition-colors"
        >
          Define this →
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => onHold?.(idea.id)}
            className="flex-1 px-4 py-2 text-xs text-[#94a3b8] border border-[#1e1e2e] rounded-lg hover:border-[#2a2a3a] hover:text-[#e2e8f0] transition-colors"
          >
            Put on hold
          </button>
          <button
            onClick={() => onRemove?.(idea.id)}
            className="flex-1 px-4 py-2 text-xs text-red-400/70 border border-[#1e1e2e] rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

```

### components/send/define-in-studio-hero.tsx

```tsx
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

```

### components/send/idea-summary-panel.tsx

```tsx
'use client'

import { useState } from 'react'
import type { Idea } from '@/types/idea'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

interface IdeaSummaryPanelProps {
  idea: Idea
}

export function IdeaSummaryPanel({ idea }: IdeaSummaryPanelProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-[#0a0a10] border border-[#1e1e2e] rounded-lg overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#12121a] transition-colors"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest">Idea breakdown</span>
        <span className="text-[#4a4a6a] text-sm select-none">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="divide-y divide-[#1e1e2e]">
          {/* From GPT section */}
          <div className="px-4 py-4 border-l-2 border-indigo-500/40">
            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">From GPT</h4>
            <div className="space-y-3">
              <div>
                <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Summary</span>
                <p className="text-sm text-[#cbd5e1] leading-relaxed">{idea.gptSummary}</p>
              </div>
              {idea.vibe && (
                <div className="flex gap-3">
                  <div>
                    <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Vibe</span>
                    <span className="inline-block px-2 py-0.5 text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                      {idea.vibe}
                    </span>
                  </div>
                  {idea.audience && (
                    <div>
                      <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Audience</span>
                      <span className="inline-block px-2 py-0.5 text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                        {idea.audience}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {idea.rawPrompt && (
                <div>
                  <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Original prompt</span>
                  <blockquote className="border-l-2 border-[#2e2e42] pl-3">
                    <p className="text-xs text-[#64748b] italic leading-relaxed">&ldquo;{idea.rawPrompt}&rdquo;</p>
                  </blockquote>
                </div>
              )}
            </div>
          </div>

          {/* Needs your input section */}
          <div className="px-4 py-4 border-l-2 border-amber-500/30">
            <h4 className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-3">
              Needs your input
            </h4>
            <ul className="space-y-2 mb-4">
              {[
                { label: 'What does success look like?', key: 'successMetric' },
                { label: 'What\'s the scope?', key: 'scope' },
                { label: 'How will it get built?', key: 'executionPath' },
                { label: 'How urgent is this?', key: 'urgency' },
              ].map(({ label }) => (
                <li key={label} className="flex items-center gap-2 text-xs text-[#64748b]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2e2e42] flex-shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
            <Link
              href={`${ROUTES.drill}?ideaId=${idea.id}`}
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              → Start defining
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

```

### components/send/send-page-client.tsx

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Idea } from '@/types/idea'
import { CapturedIdeaCard } from '@/components/send/captured-idea-card'
import { ConfirmDialog } from '@/components/common/confirm-dialog'

interface SendPageClientProps {
  ideas: Idea[]
}

export function SendPageClient({ ideas }: SendPageClientProps) {
  const router = useRouter()
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleHold(ideaId: string) {
    if (busy) return
    setBusy(true)
    try {
      await fetch('/api/actions/move-to-icebox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveConfirmed() {
    if (!pendingRemoveId || busy) return
    setBusy(true)
    try {
      await fetch('/api/actions/kill-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: pendingRemoveId }),
      })
      setPendingRemoveId(null)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        {ideas.map((idea) => (
          <CapturedIdeaCard
            key={idea.id}
            idea={idea}
            onHold={handleHold}
            onRemove={(id) => setPendingRemoveId(id)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={pendingRemoveId !== null}
        title="Remove this idea?"
        description="This will move the idea to the Removed list. This can't be undone."
        confirmLabel="Remove"
        cancelLabel="Keep it"
        variant="danger"
        onConfirm={handleRemoveConfirmed}
        onCancel={() => setPendingRemoveId(null)}
      />
    </>
  )
}

```

### components/shell/app-shell.tsx

```tsx
import { StudioSidebar } from './studio-sidebar'
import { StudioHeader } from './studio-header'
import { MobileNav } from './mobile-nav'
import { CommandBar } from './command-bar'
import { SlideOutDrawer } from '@/components/layout/slide-out-drawer'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <StudioSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <StudioHeader />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
      <MobileNav />
      <CommandBar />
      <SlideOutDrawer />
    </div>
  )
}

```

### components/shell/ChangesFloater.tsx

```tsx
'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import type { ChangeReportType } from '@/types/change-report'

export function ChangesFloater() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<ChangeReportType>('comment')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setStatus('submitting')
    try {
      const res = await fetch('/api/changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          url: typeof window !== 'undefined' ? window.location.href : (pathname || '/'),
          content: content.trim()
        })
      })

      if (!res.ok) {
        throw new Error('Failed to submit change report')
      }

      setStatus('success')
      setTimeout(() => {
        setIsOpen(false)
        setContent('')
        setStatus('idle')
        setType('comment')
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  // A subtle pill at top-center.
  return (
    <>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] transition-transform">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-purple-900/50 hover:bg-purple-800/60 backdrop-blur border border-purple-500/30 text-purple-100 text-xs px-4 py-1.5 rounded-b-lg font-medium tracking-wide shadow-lg flex items-center gap-2 transition-all hover:pt-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Report Change / Issue
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center pt-24 px-4 sm:px-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="relative bg-[#111116] border border-white/10 p-6 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-top-10">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-semibold text-white mb-2">Report Feedback</h2>
            <p className="text-sm text-white/50 mb-6 font-mono bg-black/30 p-2 rounded border border-white/5 truncate" title={typeof window !== 'undefined' ? window.location.href : pathname}>
              <span className="text-purple-400">{typeof window !== 'undefined' ? window.location.href : pathname}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Issue Type</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(['bug', 'ux', 'idea', 'change', 'comment'] as ChangeReportType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-colors capitalize ${
                        type === t 
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-200' 
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="What's broken, missing, or confusing? GPT will see this."
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 min-h-[120px]"
                  required
                />
              </div>

              {status === 'error' && (
                <div className="text-red-400 text-sm">{errorMsg}</div>
              )}

              {status === 'success' ? (
                <div className="bg-emerald-500/20 text-emerald-200 text-sm font-medium text-center py-3 rounded-lg border border-emerald-500/30">
                  Feedback logged. GPT context updated.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={status === 'submitting' || !content.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {status === 'submitting' ? 'Logging...' : 'Log Feedback for API'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  )
}

```

### components/shell/command-bar.tsx

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

const COMMANDS = [
  { label: 'Go to In Progress', href: ROUTES.arena },
  { label: 'Go to On Hold', href: ROUTES.icebox },
  { label: 'Go to Inbox', href: ROUTES.inbox },
  { label: 'Go to Shipped', href: ROUTES.shipped },
  { label: 'New Idea', href: ROUTES.send },
]

export function CommandBar() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden w-full max-w-lg mx-4 shadow-2xl">
        <div className="p-3 border-b border-[#1e1e2e]">
          <p className="text-xs text-[#94a3b8] text-center">Quick navigation</p>
        </div>
        <div className="py-1">
          {COMMANDS.map((cmd) => (
            <button
              key={cmd.href}
              onClick={() => {
                router.push(cmd.href)
                setOpen(false)
              }}
              className="flex items-center justify-between w-full px-4 py-3 text-sm text-[#e2e8f0] hover:bg-[#1e1e2e] transition-colors"
            >
              <span>{cmd.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

```

### components/shell/mobile-nav.tsx

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

import { COPY } from '@/lib/studio-copy'

const NAV_ITEMS = [
  { label: 'Progress', href: ROUTES.arena, icon: '▶' },
  { label: COPY.knowledge.heading, href: ROUTES.knowledge, icon: '📚' },
  { label: COPY.icebox.heading, href: ROUTES.icebox, icon: '❄' },
  { label: COPY.inbox.heading, href: ROUTES.inbox, icon: '◎' },
  { label: COPY.shipped.heading, href: ROUTES.shipped, icon: '✦' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around h-16 bg-[#0a0a0f] border-t border-[#1e1e2e] z-40">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              isActive ? 'text-[#6366f1]' : 'text-[#94a3b8]'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

```

### components/shell/studio-header.tsx

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Studio',
  '/send': 'Incoming Idea',
  '/drill': 'Drill',
  '/arena': 'In Progress',
  '/icebox': 'On Hold',
  '/shipped': 'Shipped',
  '/killed': 'Removed',
  '/inbox': 'Inbox',
}

export function StudioHeader() {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname ?? '/'] ?? 'Studio'

  return (
    <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-[#1e1e2e] bg-[#0a0a0f]">
      <Link href={ROUTES.home} className="flex items-center gap-2">
        <span className="text-lg font-bold text-[#6366f1]">◈</span>
        <span className="text-sm font-semibold text-[#e2e8f0]">Mira</span>
      </Link>
      <span className="text-sm text-[#94a3b8]">{title}</span>
      <Link
        href={ROUTES.send}
        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        + New
      </Link>
    </header>
  )
}

```

### components/shell/studio-sidebar.tsx

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

import { COPY } from '@/lib/studio-copy'

const NAV_ITEMS = [
  { label: COPY.inbox.heading, href: ROUTES.inbox, icon: '◎' },
  { label: COPY.library.heading, href: ROUTES.library, icon: '◇' },
  { label: COPY.skills.heading, href: ROUTES.skills, icon: '⌬' },
  { label: COPY.mindMap.heading, href: ROUTES.mindMap, icon: '⊹' },
  { label: COPY.knowledge.heading, href: ROUTES.knowledge, icon: '📚' },
  { label: COPY.memory.heading, href: ROUTES.memory, icon: '⦿' },
  { label: COPY.experience.timelinePage.heading, href: ROUTES.timeline, icon: '◷' },
  { label: COPY.profilePage.heading, href: ROUTES.profile, icon: '👤' },
  { label: COPY.arena.heading, href: ROUTES.arena, icon: '▶' },
  { label: COPY.icebox.heading, href: ROUTES.icebox, icon: '❄' },
  { label: COPY.shipped.heading, href: ROUTES.shipped, icon: '✦' },
  { label: COPY.killed.heading, href: ROUTES.killed, icon: '†' },
]

export function StudioSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-[#0a0a0f] border-r border-[#1e1e2e]">
      <div className="p-4 border-b border-[#1e1e2e]">
        <Link href={ROUTES.home} className="flex items-center gap-2">
          <span className="text-xl font-bold text-[#6366f1]">◈</span>
          <span className="text-sm font-semibold text-[#e2e8f0]">Mira Studio</span>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[#1e1e2e] text-[#e2e8f0]'
                  : 'text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#12121a]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-[#1e1e2e]">
        <Link
          href={ROUTES.send}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors"
        >
          <span>+</span>
          New Idea
        </Link>
      </div>
    </aside>
  )
}

```

### components/skills/SkillTreeCard.tsx

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { SkillDomain, SkillMasteryLevel } from '@/types/skill';
import { ROUTES } from '@/lib/routes';
import { COPY } from '@/lib/studio-copy';
import { MASTERY_THRESHOLDS, SKILL_MASTERY_LEVELS } from '@/lib/constants';

export type GridSkillDomain = SkillDomain & {
  _completedCount?: number;
  _nextExperienceId?: string | null;
};

interface SkillTreeCardProps {
  domain: GridSkillDomain;
}

export default function SkillTreeCard({ domain }: SkillTreeCardProps) {
  const getMasteryColor = (level: SkillMasteryLevel) => {
    switch (level) {
      case 'expert':
        return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'proficient':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'practicing':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'beginner':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'aware':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'undiscovered':
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const masteryWeight = {
    'undiscovered': 0,
    'aware': 20,
    'beginner': 40,
    'practicing': 60,
    'proficient': 80,
    'expert': 100,
  };

  const progress = masteryWeight[domain.masteryLevel] || 0;

  const currentLevelIdx = SKILL_MASTERY_LEVELS.indexOf(domain.masteryLevel);
  const nextLevel = currentLevelIdx < SKILL_MASTERY_LEVELS.length - 1 
    ? SKILL_MASTERY_LEVELS[currentLevelIdx + 1] 
    : domain.masteryLevel;
  
  const evidenceNeeded = domain.masteryLevel === 'expert' 
    ? 0 
    : Math.max(0, MASTERY_THRESHOLDS[nextLevel] - domain.evidenceCount);

  const totalLinked = domain.linkedExperienceIds.length;
  const completedCount = domain._completedCount || 0;
  const nextExperienceId = domain._nextExperienceId;

  return (
    <div className="flex flex-col p-6 bg-[#000000] border border-[#1e1e2e] rounded-2xl hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-indigo-500/5 min-h-[220px]">
      <div className="flex justify-between items-start mb-4">
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getMasteryColor(domain.masteryLevel)}`}>
          {domain.masteryLevel}
        </div>
        <div className="text-[10px] font-mono text-[#4a4a6a] uppercase tracking-tighter text-right">
          <div>{domain.evidenceCount} {COPY.skills.evidenceTitle}</div>
          {totalLinked > 0 && (
            <div className="text-[#64748b] mt-0.5 lowercase font-sans text-[9px] tracking-normal">
              {COPY.skills.experiencesDone.replace('{completed}', String(completedCount)).replace('{total}', String(totalLinked))}
            </div>
          )}
        </div>
      </div>

      <Link href={ROUTES.skillDomain(domain.id)}>
        <h3 className="text-xl font-bold text-[#f1f5f9] mb-2 group-hover:text-indigo-300 transition-colors capitalize">
          {domain.name.replace(/-/g, ' ')}
        </h3>
      </Link>

      <p className="text-sm text-[#94a3b8] line-clamp-2 mb-2 min-h-[2.5rem]">
        {domain.description}
      </p>

      <div className="text-xs text-[#64748b] mb-4">
        {domain.masteryLevel === 'expert' 
          ? COPY.skills.maxLevel
          : COPY.skills.neededForNext.replace('{count}', String(evidenceNeeded)).replace('{level}', nextLevel)
        }
      </div>

      <div className="mt-auto space-y-4">
        <div>
          <div className="flex justify-between text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
            <span>{COPY.skills.domainProgress}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-[#1e1e2e] rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)] ${
                domain.masteryLevel === 'expert' ? 'bg-violet-500 shadow-violet-500/30' :
                domain.masteryLevel === 'proficient' ? 'bg-emerald-500 shadow-emerald-500/30' :
                'bg-indigo-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {nextExperienceId ? (
          <Link 
            href={ROUTES.workspace(nextExperienceId)}
            className="flex items-center justify-between group/link"
          >
            <span className="text-xs font-bold text-indigo-400 group-hover/link:text-indigo-300 transition-colors">
              {COPY.skills.actions.whatNext}
            </span>
            <span className="text-indigo-400 group-hover/link:translate-x-1 transition-transform">→</span>
          </Link>
        ) : totalLinked > 0 ? (
          <Link 
            href={ROUTES.library}
            className="flex items-center justify-between group/link"
          >
            <span className="text-xs font-bold text-emerald-400 group-hover/link:text-emerald-300 transition-colors">
              {COPY.skills.allCompleted}
            </span>
          </Link>
        ) : (
          <div className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest italic pt-1">
            Undiscovered terrain
          </div>
        )}
      </div>
    </div>
  );
}

```

### components/skills/SkillTreeGrid.tsx

```tsx
'use client';

import React from 'react';
import SkillTreeCard, { GridSkillDomain } from './SkillTreeCard';

interface SkillTreeGridProps {
  domains: GridSkillDomain[];
}

export default function SkillTreeGrid({ domains }: SkillTreeGridProps) {
  if (domains.length === 0) {
    return (
      <div className="py-12 px-6 border border-dashed border-[#1e1e2e] rounded-3xl text-center bg-[#0d0d18]/30">
        <span className="text-sm font-medium text-[#4a4a6a]">No skill domains discovered yet.</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {domains.map((domain) => (
        <SkillTreeCard key={domain.id} domain={domain} />
      ))}
    </div>
  );
}

```

### components/think/map-sidebar.tsx

```tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COPY } from '@/lib/studio-copy'
import { ThinkBoard, BoardPurpose } from '@/types/mind-map'

interface MapSidebarProps {
  boards: (ThinkBoard & { nodeCount: number; edgeCount: number })[]
  activeBoardId: string
}

const PURPOSE_CONFIG: Record<BoardPurpose, { label: string; color: string; preview: string }> = {
  general: { 
    label: 'General', 
    color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    preview: 'A blank canvas for your thoughts.'
  },
  idea_planning: { 
    label: 'Idea Planning', 
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    preview: 'Auto-creates nodes for Market, Tech, UX, and Risks.'
  },
  curriculum_review: { 
    label: 'Curriculum', 
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    preview: 'Auto-creates nodes for Foundations, Core, Advanced, and Cases.'
  },
  lesson_plan: { 
    label: 'Lesson Plan', 
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    preview: 'Auto-creates nodes for Primer, Practice, Checkpoint, and Reflection.'
  },
  research_tracking: { 
    label: 'Research', 
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    preview: 'Auto-creates nodes for Pending, In Progress, and Complete.'
  },
  strategy: { 
    label: 'Strategy', 
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    preview: 'Auto-creates domain-level strategic nodes.'
  },
}

export function MapSidebar({ boards, activeBoardId }: MapSidebarProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPurpose, setNewPurpose] = useState<BoardPurpose>('general')
  const [loading, setLoading] = useState(false)

  const filteredBoards = boards.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSwitch = (id: string) => {
    router.push(`/map?boardId=${id}`)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || loading) return
    setLoading(true)

    try {
      const resp = await fetch('/api/mindmap/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newName,
          purpose: newPurpose
        })
      })
      
      if (resp.ok) {
        const newBoard = await resp.json()
        setNewName('')
        setNewPurpose('general')
        setIsCreating(false)
        router.push(`/map?boardId=${newBoard.id}`)
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to create board:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this board? This cannot be undone.')) return

    try {
      const resp = await fetch(`/api/mindmap/boards/${id}`, { method: 'DELETE' })
      if (resp.ok) {
        if (id === activeBoardId) {
          const next = boards.filter(b => b.id !== id)[0]
          router.push(next ? `/map?boardId=${next.id}` : '/map')
        }
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to delete board:', err)
    }
  }

  return (
    <aside className="w-[360px] h-full flex flex-col bg-[#05050a] border-l border-[#1e1e2e] shadow-2xl relative z-20">
      <div className="p-6 border-b border-[#1e1e2e]">
        <h2 className="text-lg font-bold text-[#f1f5f9] mb-4 flex items-center gap-2">
          <span className="text-[#6366f1] text-xl font-mono leading-none">⊹</span>
          {COPY.mindMap.heading}
        </h2>
        
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569] text-xs">⚲</span>
          <input
            type="text"
            placeholder="Search boards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg pl-8 pr-3 py-2 text-xs text-[#e2e8f0] focus:ring-1 focus:ring-[#6366f1] focus:border-[#6366f1] outline-none transition-all placeholder:text-[#475569]"
          />
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/10"
          >
            <span>+</span>
            {COPY.mindMap.actions.createBoard}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {filteredBoards.map(board => {
          const active = board.id === activeBoardId
          const config = PURPOSE_CONFIG[board.purpose || 'general']
          
          return (
            <button
              key={board.id}
              onClick={() => handleSwitch(board.id)}
              className={`group relative w-full p-4 rounded-xl text-left border transition-all duration-300 ${
                active 
                  ? 'bg-[#1e1e2e]/50 border-indigo-500/30' 
                  : 'bg-[#12121a]/30 border-transparent hover:bg-[#12121a]/80 hover:border-[#1e1e2e]'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${config.color}`}>
                  {config.label}
                </span>
                <span 
                  onClick={(e) => handleDelete(e, board.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#475569] hover:text-red-400 transition-all text-sm p-1 leading-none"
                  title="Archive Board"
                >
                  ×
                </span>
              </div>
              
              <h4 className={`text-sm font-semibold truncate mb-3 ${active ? 'text-indigo-300' : 'text-[#e2e8f0]'}`}>
                {board.name}
              </h4>

              <div className="flex items-center gap-4 text-[10px] text-[#64748b] font-mono">
                <div className="flex items-center gap-1">
                  <span className="text-[#475569]">N:</span>
                  <span>{board.nodeCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[#475569]">E:</span>
                  <span>{board.edgeCount}</span>
                </div>
              </div>

              {active && (
                <div className="absolute right-4 bottom-4 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              )}
            </button>
          )
        })}

        {filteredBoards.length === 0 && search && (
          <div className="text-center py-10">
            <p className="text-xs text-[#64748b]">No boards matching "{search}"</p>
          </div>
        )}
      </div>

      {isCreating && (
        <div className="p-6 border-t border-[#1e1e2e] bg-[#0a0a14] animate-in slide-in-from-bottom duration-300">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#475569] uppercase tracking-widest px-1">Board Name</label>
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name your map..."
                className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:ring-1 focus:ring-indigo-500 outline-none"
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#475569] uppercase tracking-widest px-1">Purpose</label>
              <div className="relative">
                <select
                  value={newPurpose}
                  onChange={(e) => setNewPurpose(e.target.value as BoardPurpose)}
                  className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] outline-none appearance-none cursor-pointer"
                  disabled={loading}
                >
                  {Object.entries(PURPOSE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#475569] text-[10px]">▼</span>
              </div>
            </div>

            <p className="px-1 text-[10px] italic text-[#64748b] leading-relaxed">
              {PURPOSE_CONFIG[newPurpose].preview}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex-1 px-4 py-2 rounded-lg text-xs font-bold text-[#94a3b8] hover:bg-[#1e1e2e] transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/10"
                disabled={!newName.trim() || loading}
              >
                {loading ? 'Creating...' : 'Create Board'}
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  )
}

```

### components/think/node-content-modal.tsx

```tsx
'use client'

import React, { useState, useEffect } from 'react'

import type { ThinkNode as ThinkNodeData } from '@/types/mind-map'

interface NodeContentModalProps {
  isOpen: boolean
  onClose: () => void
  node: {
    id: string
    data: ThinkNodeData
  }
}

export function NodeContentModal({ isOpen, onClose, node }: NodeContentModalProps) {
  const [label, setLabel] = useState(node.data.label)
  const [description, setDescription] = useState(node.data.description || '')
  const [content, setContent] = useState(node.data.content || '')
  const [color, setColor] = useState(node.data.color || '#3f3f46')
  const [isSaving, setIsSaving] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  // Sync state when node changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setLabel(node.data.label)
      setDescription(node.data.description || '')
      setContent(node.data.content || '')
      setColor(node.data.color || '#3f3f46')
    }
  }, [isOpen, node])

  if (!isOpen) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // PATCH /api/gpt/update with action: 'update_map_node'
      const resp = await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_map_node',
          payload: {
            nodeId: node.id,
            label,
            description,
            content, // Lane 2 will handle this in service
            color
          }
        }),
      })
      if (!resp.ok) throw new Error('Failed to update node')
      
      onClose()
      window.location.reload()
    } catch (err) {
      console.error('Failed to save node:', err)
      alert('Failed to save node changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = async (type: 'idea' | 'knowledge' | 'goal') => {
    setExporting(type)
    const DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000001';
    
    try {
      let payload = {};

      if (type === 'idea') {
        payload = {
          userId: DEFAULT_USER_ID,
          title: label,
          rawPrompt: content || description || `From mind map node: ${label}`,
          gptSummary: description || label
        };
      } else if (type === 'goal') {
        payload = {
          userId: DEFAULT_USER_ID,
          title: label,
          description: description || label,
          status: 'proposed'
        };
      } else if (type === 'knowledge') {
        payload = {
          userId: DEFAULT_USER_ID,
          title: label,
          content: content || description || `Knowledge unit extracted from mind map: ${label}`,
          topic: label,
          domain: 'Mind Map',
          unit_type: 'guide',
          thesis: description ? description.split('.')[0] : label
        };
      }

      // 1. CREATE Entity via Gateway
      const createResp = await fetch('/api/gpt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload })
      });
      
      if (!createResp.ok) throw new Error(`Export failed for ${type}`);
      const createdEntity = await createResp.json();
      const entityId = createdEntity.id;

      // 2. TWO-WAY BINDING: Update the node with metadata
      const updateResp = await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_map_node',
          payload: {
            nodeId: node.id,
            nodeType: 'exported',
            metadata: {
              ...node.data.metadata,
              linkedEntityId: entityId,
              linkedEntityType: type
            }
          }
        })
      });

      if (!updateResp.ok) throw new Error(`Metadata update failed for node ${node.id}`);
      
      onClose();
      window.location.reload(); 
    } catch (err) {
      console.error(`Export failed for ${type}:`, err);
      alert(`Export failed for ${type}.`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="w-[360px] h-full flex flex-col bg-[#0a0a14] border-l border-[#1e1e2e] shadow-2xl relative z-20 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e2e] bg-[#12121a]">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-bold text-white tracking-tight">Node Elaboration</h2>
          <span className="text-[10px] font-mono text-indigo-400/80 uppercase tracking-widest">
            {node.data.nodeType || 'manual'} node • {node.id.slice(0, 8)}
          </span>
        </div>
        <button 
          onClick={onClose} 
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1e1e2e] hover:bg-[#2e2e3e] text-[#64748b] hover:text-white transition-all shadow-sm"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* Label */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Title</label>
          <input 
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full bg-[#050510] border border-[#1e1e2e] rounded-xl px-4 py-3 text-[#f1f5f9] font-bold focus:border-indigo-500/50 outline-none transition-all placeholder:text-[#334155]"
            placeholder="Give this node a name"
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Hover Summary</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#050510] border border-[#1e1e2e] rounded-xl px-4 py-3 text-[#94a3b8] text-sm leading-relaxed focus:border-indigo-500/50 outline-none transition-all resize-none placeholder:text-[#334155]"
              placeholder="A brief summary for the canvas view..."
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Visual Theme</label>
            <div className="flex flex-wrap gap-2 p-3 bg-[#050510] border border-[#1e1e2e] rounded-xl">
              {['#3f3f46', '#6366f1', '#10b981', '#f59e0b', '#ef4444'].map((c) => (
                <button 
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Deep Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pl-1">
            <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest">Deep Content</label>
            <span className="text-[9px] text-indigo-400 font-mono">MD SUPPORTED</span>
          </div>
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full bg-[#050510] border border-[#1e1e2e] rounded-xl px-4 py-4 text-[#e2e8f0] text-sm leading-relaxed focus:border-indigo-500/50 outline-none transition-all resize-none placeholder:text-[#334155] font-mono"
            placeholder="Elaborate on your thinking here. Notes, research, data points, paragraphs..."
          />
        </div>

        {/* Export Actions */}
        <div className="space-y-3 pt-2">
          <h3 className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Export to Studio</h3>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => handleExport('idea')}
              disabled={!!exporting}
              className="group relative px-4 py-3 bg-[#0d0d18] border border-[#1e1e2e] hover:border-indigo-500/40 rounded-xl transition-all flex items-center justify-between text-left"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-[#f1f5f9]">Draft Idea</span>
                <span className="text-[10px] text-[#64748b] group-hover:text-indigo-400 transition-colors">Capture for review</span>
              </div>
              <span className="text-[#64748b] group-hover:text-indigo-400 transition-colors text-lg leading-none">+</span>
              {exporting === 'idea' && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500 animate-pulse" />}
            </button>

            <button 
              onClick={() => handleExport('goal')}
              disabled={!!exporting}
              className="group relative px-4 py-3 bg-[#0d0d18] border border-[#1e1e2e] hover:border-emerald-500/40 rounded-xl transition-all flex items-center justify-between text-left"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-[#f1f5f9]">Create Goal</span>
                <span className="text-[10px] text-[#64748b] group-hover:text-emerald-400 transition-colors">Target outcome</span>
              </div>
              <span className="text-[#64748b] group-hover:text-emerald-400 transition-colors text-lg leading-none">+</span>
              {exporting === 'goal' && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500 animate-pulse" />}
            </button>

            <button 
              onClick={() => handleExport('knowledge')}
              disabled={!!exporting}
              className="group relative px-4 py-3 bg-[#0d0d18] border border-[#1e1e2e] hover:border-amber-500/40 rounded-xl transition-all flex items-center justify-between text-left"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-[#f1f5f9]">Save Knowledge</span>
                <span className="text-[10px] text-[#64748b] group-hover:text-amber-400 transition-colors">Add to library</span>
              </div>
              <span className="text-[#64748b] group-hover:text-amber-400 transition-colors text-lg leading-none">+</span>
              {exporting === 'knowledge' && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500 animate-pulse" />}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-2 p-6 border-t border-[#1e1e2e] bg-[#12121a]">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Commit Changes'}
        </button>
        <button 
          onClick={onClose}
          className="w-full py-2 text-xs font-bold text-[#94a3b8] hover:text-white transition-colors"
        >
          Discard
        </button>
      </div>
    </div>
  )
}

```

### components/think/node-context-menu.tsx

```tsx
'use client'

import React, { useEffect, useRef } from 'react'

interface NodeContextMenuProps {
  x: number
  y: number
  node: any
  onClose: () => void
  onOpenModal: (node: any) => void
  onAddChild: (nodeId: string) => void
  onDelete: (nodeId: string) => void
  onColorChange: (nodeId: string, color: string) => void
  onExport: (node: any, type: 'idea' | 'goal' | 'knowledge') => void
  onExpandBranch: (nodeId: string) => void
  onSuggestGaps: () => void
  onLinkMemory: (nodeId: string) => void
}

export function NodeContextMenu({
  x,
  y,
  node,
  onClose,
  onOpenModal,
  onAddChild,
  onDelete,
  onColorChange,
  onExport,
  onExpandBranch,
  onSuggestGaps,
  onLinkMemory
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const colors = [
    { label: 'Default', hex: '#3f3f46' },
    { label: 'Indigo', hex: '#6366f1' },
    { label: 'Emerald', hex: '#10b981' },
    { label: 'Amber', hex: '#f59e0b' },
    { label: 'Red', hex: '#ef4444' }
  ]

  return (
    <div 
      ref={menuRef}
      className="fixed z-[100] w-64 bg-[#12121a] border border-[#1e1e2e] rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-2 border-b border-[#1e1e2e] mb-1">
        <span className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest leading-none">
          Node Actions • {node.id.slice(0, 8)}
        </span>
      </div>

      <button 
        onClick={() => { onOpenModal(node); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#94a3b8] hover:text-white hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
      >
        <span className="text-base">⋯</span>
        Edit Details
      </button>

      <button 
        onClick={() => { onAddChild(node.id); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#94a3b8] hover:text-white hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
      >
        <span className="text-base">+</span>
        Add Child Node
      </button>

      <div className="group relative">
        <button 
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-xs text-[#94a3b8] group-hover:text-white group-hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
        >
          <div className="flex items-center gap-3">
            <span 
              className="w-3.5 h-3.5 rounded-full border border-white/20" 
              style={{ backgroundColor: node.data.color || '#3f3f46' }} 
            />
            Change Color
          </div>
          <span className="text-[10px] text-[#4a4a6a]">▶</span>
        </button>

        <div className="absolute top-0 left-full ml-1 hidden group-hover:block w-40 bg-[#12121a] border border-[#1e1e2e] rounded-xl shadow-2xl p-1 animate-in fade-in slide-in-from-left-1 duration-150">
          {colors.map((c) => (
            <button 
              key={c.hex}
              onClick={() => { onColorChange(node.id, c.hex); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-[#94a3b8] hover:text-white hover:bg-[#1e1e2e] rounded-lg transition-all"
            >
              <span className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: c.hex }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-[#1e1e2e] my-1 mx-1" />

      <button 
        onClick={() => { onExport(node, 'idea'); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#94a3b8] hover:text-indigo-400 hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
      >
        <span className="text-base">💡</span>
        Export as Idea
      </button>

      <button 
        onClick={() => { onExport(node, 'goal'); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#94a3b8] hover:text-emerald-400 hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
      >
        <span className="text-base">⌬</span>
        Export as Goal
      </button>

      <button 
        onClick={() => { onExport(node, 'knowledge'); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#94a3b8] hover:text-amber-400 hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
      >
        <span className="text-base">📖</span>
        Export as Knowledge
      </button>

      <div className="h-px bg-[#1e1e2e] my-1 mx-1" />

      <div className="px-3 py-2">
        <span className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest leading-none">
          AI Macros
        </span>
      </div>

      <button 
        onClick={() => { onExpandBranch(node.id); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-indigo-400 hover:text-white hover:bg-indigo-600/20 rounded-xl transition-all font-semibold"
      >
        <span className="text-base">🪄</span>
        Expand Branch (AI)
      </button>

      <button 
        onClick={() => { onSuggestGaps(); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-amber-400 hover:text-white hover:bg-amber-600/20 rounded-xl transition-all font-semibold"
      >
        <span className="text-base">✨</span>
        Suggest Gaps (AI)
      </button>

      <button 
        onClick={() => { onLinkMemory(node.id); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-emerald-400 hover:text-white hover:bg-emerald-600/20 rounded-xl transition-all font-semibold"
      >
        <span className="text-base">🧠</span>
        Relink Memories
      </button>

      <div className="h-px bg-[#1e1e2e] my-1 mx-1" />

      <button 
        onClick={() => { onDelete(node.id); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-red-900/40 hover:text-red-400 hover:bg-red-900/10 rounded-xl transition-all font-medium"
      >
        <span className="text-base">−</span>
        Delete Node
      </button>
    </div>
  )
}

```

### components/think/think-board-switcher.tsx

```tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COPY } from '@/lib/studio-copy'
import { ThinkBoard } from '@/types/mind-map'

interface ThinkBoardSwitcherProps {
  boards: ThinkBoard[]
  activeBoardId: string
}

export function ThinkBoardSwitcher({ boards, activeBoardId }: ThinkBoardSwitcherProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0]

  const handleSwitch = (boardId: string) => {
    router.push(`/map?boardId=${boardId}`)
    setIsOpen(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBoardName.trim()) return

    try {
      const resp = await fetch('/api/mindmap/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBoardName })
      })
      
      if (resp.ok) {
        const newBoard = await resp.json()
        router.push(`/map?boardId=${newBoard.id}`)
        router.refresh()
        setIsCreating(false)
        setNewBoardName('')
        setIsOpen(false)
      }
    } catch (err) {
      console.error('Failed to create board:', err)
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e1e2e] border border-[#2e2e3e] hover:border-[#4338ca] transition-all group"
      >
        <span className="text-xs font-semibold text-[#818cf8]">
          {activeBoard?.name}
        </span>
        <span className={`text-[#94a3b8] transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-[#0a0a1a] border border-[#1e1e2e] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-2 flex flex-col gap-1 max-h-64 overflow-y-auto">
              {boards.map(board => (
                <button
                  key={board.id}
                  onClick={() => handleSwitch(board.id)}
                  className={`
                    flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-left transition-colors
                    ${board.id === activeBoardId 
                      ? 'bg-[#1e1e2e] text-[#f8fafc]' 
                      : 'text-[#94a3b8] hover:bg-[#1e1e2e] hover:text-[#f8fafc]'}
                  `}
                >
                  <span className="truncate">{board.name}</span>
                  {board.id === activeBoardId && <span className="text-[#818cf8]">✓</span>}
                </button>
              ))}
            </div>

            <div className="border-t border-[#1e1e2e] p-2 bg-[#050510]/50">
              {isCreating ? (
                <form onSubmit={handleCreate} className="flex flex-col gap-2 p-1">
                  <input
                    autoFocus
                    type="text"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    placeholder="Board name..."
                    className="w-full bg-[#0a0a1a] border border-[#2e2e3e] rounded-md px-2 py-1.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#4338ca]"
                  />
                  <div className="flex gap-2">
                    <button 
                      type="submit"
                      disabled={!newBoardName.trim()}
                      className="flex-1 px-3 py-1.5 bg-[#4338ca] hover:bg-[#4f46e5] disabled:opacity-50 text-xs font-medium rounded-md text-white transition-colors"
                    >
                      Create
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-3 py-1.5 bg-[#1e1e2e] hover:bg-[#2e2e3e] text-xs font-medium rounded-md text-[#94a3b8] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold text-[#818cf8] hover:bg-[#1e1e2e] transition-colors"
                >
                  <span>+</span>
                  {COPY.mindMap.actions.createBoard}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

```

### components/think/think-canvas.tsx

```tsx
'use client'

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import { ThinkNode } from './think-node'
import { NodeContentModal } from './node-content-modal'
import { NodeContextMenu } from './node-context-menu'
import Link from 'next/link'
import type { ThinkNode as ThinkNodeData, ThinkEdge as ThinkEdgeData } from '@/types/mind-map'

const nodeTypes = {
  think: ThinkNode,
}

interface ThinkCanvasProps {
  boardId: string
  initialNodes: ThinkNodeData[]
  initialEdges: ThinkEdgeData[]
  userId: string
  boards: any[]
}

function ThinkCanvasInner({ boardId, initialNodes, initialEdges, userId, boards }: ThinkCanvasProps) {
  const { screenToFlowPosition, getIntersectingNodes, fitView } = useReactFlow()
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeModalNode, setActiveModalNode] = useState<any>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: Node } | null>(null)
  const [memoryCounts, setMemoryCounts] = useState<Record<string, number>>({})
  const [isAiLoading, setIsAiLoading] = useState(false)

  // Ref to break circular dependency: callbacks read current nodes without re-creating
  const nodesRef = useRef<Node[]>(nodes)
  nodesRef.current = nodes

  // Persistence: Node Position Update (Optimistic + Silent)
  const persistNodePosition = useCallback(async (nodeId: string, x: number, y: number) => {
    try {
      await fetch(`/api/mindmap/nodes/${nodeId}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y }),
      })
    } catch (err) {
      console.error('Failed to persist node position:', err)
    }
  }, [])

  const fetchMemoryCounts = useCallback(async () => {
    try {
      const resp = await fetch('/api/gpt/memory')
      if (resp.ok) {
        const memories = await resp.json()
        const counts: Record<string, number> = {}
        memories.forEach((m: any) => {
          const nodeId = m.metadata?.nodeId || m.metadata?.linkedNodeId
          if (nodeId) {
            counts[nodeId] = (counts[nodeId] || 0) + 1
          }
        })
        setMemoryCounts(counts)
      }
    } catch (err) {
      console.warn('Failed to fetch memory counts:', err)
    }
  }, [])

  const onDeleteNode = useCallback(async (nodeId: string) => {
    // Optimistic delete: remove node and connected edges
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))

    try {
      await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_map_node',
          payload: { nodeId }
        })
      })
    } catch (err) {
      console.error('Failed to delete node:', err)
      // On error, we might want to revert or just refresh boards
      window.location.reload()
    }
  }, [setNodes, setEdges])

  const onColorChange = useCallback(async (nodeId: string, color: string) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, color } } : n))
    
    try {
      await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_map_node',
          payload: { nodeId, color }
        })
      })
    } catch (err) {
      console.warn('Failed to persist color update:', err)
    }
  }, [setNodes])

  const onAddChild = useCallback(async (parentNodeId: string) => {
    const parentNode = nodesRef.current.find(n => n.id === parentNodeId);
    if (!parentNode) return;

    const x = parentNode.position.x + 250;
    const y = parentNode.position.y;

    // Local optimistic placeholder (optional, but keep it robust)
    const tempId = crypto.randomUUID();
    
    setNodes((nds) => [...nds, {
      id: tempId,
      type: 'think',
      position: { x, y },
      data: { label: 'New Node', color: parentNode.data.color, nodeType: 'manual' }
    }])

    try {
      const resp = await fetch('/api/gpt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'map_node',
          payload: { userId, boardId, label: 'New Child', position_x: x, position_y: y, parentNodeId }
        })
      })
      
      if (resp.ok) {
        const newNodeData = await resp.json()
        
        // Finalize node ID and link
        setNodes((nds) => nds.map(n => n.id === tempId ? { ...n, id: newNodeData.id } : n))

        const edgeResp = await fetch('/api/gpt/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'map_edge',
            payload: { boardId, sourceNodeId: parentNodeId, targetNodeId: newNodeData.id }
          })
        })

        if (edgeResp.ok) {
          const newEdgeData = await edgeResp.json()
          setEdges((eds) => addEdge({
            id: newEdgeData.id,
            source: parentNodeId,
            target: newNodeData.id,
            style: { stroke: '#3F464E' }
          }, eds))
        }
      }
    } catch (err) {
      console.error('Failed to create child node:', err)
      setNodes((nds) => nds.filter(n => n.id !== tempId))
    }
  }, [boardId, userId, setNodes, setEdges])

  const onExpandBranch = useCallback(async (nodeId: string) => {
    setIsAiLoading(true)
    try {
      const resp = await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'expand_board_branch',
          payload: { boardId, nodeId, userId }
        })
      })
      if (resp.ok) {
        // AI flow returns suggested nodes, but we might need to refresh 
        // to see the real DB records. For simplicity, we reload.
        window.location.reload()
      }
    } catch (err) {
      console.error('AI Expansion failed:', err)
    } finally {
      setIsAiLoading(false)
    }
  }, [boardId, userId])

  const onSuggestGaps = useCallback(async () => {
    setIsAiLoading(true)
    try {
      const resp = await fetch('/api/gpt/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest_board_gaps',
          payload: { boardId, userId }
        })
      })
      if (resp.ok) {
        // Usually shows a toast or opens a drawer with suggestions
        // For now, reload to see if AI auto-created any gaps (or just notify)
        alert('AI is analyzing gaps. Check back in a moment.')
      }
    } catch (err) {
      console.error('Gap analysis failed:', err)
    } finally {
      setIsAiLoading(false)
    }
  }, [boardId, userId])

  const onLinkMemory = useCallback(async (nodeId: string) => {
    alert(`Node ${nodeId} memory linking mode. (Select memories in Explorer to link)`)
  }, [])

  const onReparent = useCallback(async (nodeId: string, newParentId: string) => {
    // Optimistically update edges (remove incoming, add new)
    setEdges((eds) => {
      const filtered = eds.filter(e => e.target !== nodeId);
      return addEdge({ 
        id: crypto.randomUUID(), 
        source: newParentId, 
        target: nodeId, 
        style: { stroke: '#3F464E' } 
      }, filtered);
    });

    try {
      await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reparent_node',
          payload: { boardId, nodeId, sourceNodeId: newParentId }
        })
      });
    } catch (err) {
      console.error('Failed to reparent node:', err);
      window.location.reload();
    }
  }, [boardId, setEdges]);

  // Map our service nodes to xyflow nodes
  const mapNodes = useCallback((nodesData: ThinkNodeData[]): Node[] => {
    return nodesData.map((node) => ({
      id: node.id,
      type: 'think',
      position: { x: node.positionX, y: node.positionY },
      data: {
        label: node.label,
        description: node.description,
        content: node.content,
        color: node.color,
        nodeType: node.nodeType,
        metadata: node.metadata,
        memoryCount: memoryCounts[node.id] || 0,
        onAddChild,
        onDelete: onDeleteNode,
        onOpenModal: (n: any) => {
          setActiveModalNode(n)
          setIsSidebarOpen(true)
        }
      },
      selected: false,
    }))
  }, [onAddChild, onDeleteNode, memoryCounts])

  // Map our service edges to xyflow edges
  const mapEdges = useCallback((edgesData: ThinkEdgeData[]): Edge[] => {
    return edgesData.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      label: edge.edgeType === 'ai_generated' ? 'AI Link' : undefined,
      animated: edge.edgeType === 'ai_generated',
      style: { stroke: edge.edgeType === 'ai_generated' ? '#6366f1' : '#3F464E' },
    }))
  }, [])

  // Initialize nodes/edges when boardId changes
  useEffect(() => {
    setNodes(mapNodes(initialNodes))
    setEdges(mapEdges(initialEdges))
    setContextMenu(null)
    setActiveModalNode(null)
    fetchMemoryCounts()
  }, [boardId, initialNodes, initialEdges, setNodes, setEdges, mapNodes, mapEdges, fetchMemoryCounts])

  const onConnect: OnConnect = useCallback(
    async (params: Connection) => {
      try {
        const resp = await fetch('/api/gpt/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'map_edge',
            payload: {
              boardId,
              sourceNodeId: params.source,
              targetNodeId: params.target,
            }
          })
        })
        
        if (resp.ok) {
          const newEdge = await resp.json()
          setEdges((eds) => addEdge({ 
            id: newEdge.id,
            source: params.source!,
            target: params.target!,
            style: { stroke: '#3F464E' } 
          }, eds))
        }
      } catch (err) {
        console.error('Failed to create edge:', err)
      }
    },
    [boardId, setEdges]
  )

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      persistNodePosition(node.id, node.position.x, node.position.y)
      
      const intersections = getIntersectingNodes(node);
      if (intersections.length > 0) {
        const targetNode = intersections[0];
        // Edge-based reparenting (Lock 4)
        onReparent(node.id, targetNode.id);
      }
    },
    [persistNodePosition, getIntersectingNodes, onConnect]
  )

  const onPaneDoubleClick = useCallback(async (event: React.MouseEvent) => {
    const { x, y } = screenToFlowPosition({ x: event.clientX, y: event.clientY })

    try {
      const resp = await fetch('/api/gpt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'map_node',
          payload: { userId, boardId, label: 'New Node', position_x: x, position_y: y }
        })
      })
      
      if (resp.ok) {
        const newNode = await resp.json()
        setNodes((nds) => [...nds, {
          id: newNode.id,
          type: 'think',
          position: { x, y },
          data: { 
            label: newNode.label, 
            color: newNode.color, 
            nodeType: 'manual',
            onAddChild,
            onDelete: onDeleteNode,
            onOpenModal: (n: any) => setActiveModalNode(n)
          },
        }])
      }
    } catch (err) {
      console.error('Failed to create node:', err)
    }
  }, [screenToFlowPosition, boardId, userId, setNodes, onAddChild, onDeleteNode])

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, node })
  }, [])

  const onExportEntity = useCallback(async (node: any, type: string) => {
    setActiveModalNode(node)
  }, [])

  const onNodesDelete = useCallback((nodesToDelete: Node[]) => {
    nodesToDelete.forEach(n => onDeleteNode(n.id))
  }, [onDeleteNode])

  const onEdgesDelete = useCallback(async (edgesToDelete: Edge[]) => {
    for (const edge of edgesToDelete) {
      try {
        await fetch('/api/gpt/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete_map_edge',
            payload: { edgeId: edge.id }
          })
        })
      } catch (err) {
        console.warn('Failed to persist edge deletion:', err)
      }
    }
  }, [])

  const onExplode = useCallback(() => {
    const currentNodes = nodesRef.current
    const currentEdges = edges

    if (currentNodes.length === 0) return

    const NODE_W = 160
    const NODE_H = 70
    const PADDING = 20
    const IDEAL_DIST_BASE = 140
    const IDEAL_DIST_PER_CHILD = 30
    const ATTRACTION = 0.08
    const REPULSION = 5000
    const ITERATIONS = 120
    const DAMPING = 0.9
    const MAX_FORCE = 50
    const TEMP_START = 1.0
    const TEMP_END = 0.05

    const adj = new Map<string, Set<string>>()
    const edgeSet = new Set<string>()
    for (const node of currentNodes) adj.set(node.id, new Set())
    for (const edge of currentEdges) {
      adj.get(edge.source)?.add(edge.target)
      adj.get(edge.target)?.add(edge.source)
      edgeSet.add(`${edge.source}|${edge.target}`)
      edgeSet.add(`${edge.target}|${edge.source}`)
    }

    const weight = new Map<string, number>()
    for (const node of currentNodes) {
      const visited = new Set<string>()
      const q = [node.id]
      visited.add(node.id)
      while (q.length > 0) {
        const nid = q.shift()!
        for (const nbr of Array.from(adj.get(nid) ?? [])) {
          if (!visited.has(nbr)) { visited.add(nbr); q.push(nbr) }
        }
      }
      weight.set(node.id, visited.size)
    }

    const idealDist = (a: string, b: string) => {
      const wa = weight.get(a) ?? 1
      const wb = weight.get(b) ?? 1
      return IDEAL_DIST_BASE + Math.log2(wa + wb) * IDEAL_DIST_PER_CHILD
    }

    const sorted = [...currentNodes].sort((a, b) => 
      (adj.get(b.id)?.size ?? 0) - (adj.get(a.id)?.size ?? 0)
    )
    
    type Pt = { x: number; y: number }
    const pos = new Map<string, Pt>()
    const vel = new Map<string, Pt>()
    
    pos.set(sorted[0].id, { x: 0, y: 0 })
    vel.set(sorted[0].id, { x: 0, y: 0 })
    
    const placed = new Set([sorted[0].id])
    const bfsQ = [sorted[0].id]

    while (bfsQ.length > 0) {
      const nid = bfsQ.shift()!
      const npos = pos.get(nid)!
      const nbrs = Array.from(adj.get(nid) ?? []).filter(n => !placed.has(n))
      
      const angle0 = placed.size * 0.618 * 2 * Math.PI
      nbrs.forEach((nbr, i) => {
        const angle = angle0 + (2 * Math.PI * i) / Math.max(nbrs.length, 1)
        const r = idealDist(nid, nbr) * 0.6
        pos.set(nbr, { x: npos.x + r * Math.cos(angle), y: npos.y + r * Math.sin(angle) })
        vel.set(nbr, { x: 0, y: 0 })
        placed.add(nbr)
        bfsQ.push(nbr)
      })
    }

    for (const node of currentNodes) {
      if (!pos.has(node.id)) {
        pos.set(node.id, { x: 0, y: 300 })
        vel.set(node.id, { x: 0, y: 0 })
      }
    }

    const ids = currentNodes.map(n => n.id)
    const n = ids.length

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const temp = TEMP_START - (TEMP_START - TEMP_END) * (iter / ITERATIONS)
      const forces = new Map<string, Pt>()
      for (const id of ids) forces.set(id, { x: 0, y: 0 })

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = ids[i], b = ids[j]
          const pa = pos.get(a)!, pb = pos.get(b)!
          let dx = pb.x - pa.x
          let dy = pb.y - pa.y
          let dist = Math.sqrt(dx * dx + dy * dy) || 0.1
          const force = REPULSION / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          const fa = forces.get(a)!, fb = forces.get(b)!
          fa.x -= fx; fa.y -= fy
          fb.x += fx; fb.y += fy
        }
      }

      for (const edge of currentEdges) {
        const a = edge.source, b = edge.target
        if (!pos.has(a) || !pos.has(b)) continue
        const pa = pos.get(a)!, pb = pos.get(b)!
        let dx = pb.x - pa.x
        let dy = pb.y - pa.y
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.1
        const target = idealDist(a, b)
        const force = ATTRACTION * (dist - target)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        const fa = forces.get(a)!, fb = forces.get(b)!
        fa.x += fx; fa.y += fy
        fb.x -= fx; fb.y -= fy
      }

      for (const id of ids) {
        const f = forces.get(id)!, v = vel.get(id)!, p = pos.get(id)!
        v.x = (v.x + f.x) * DAMPING * temp
        v.y = (v.y + f.y) * DAMPING * temp
        const speed = Math.sqrt(v.x * v.x + v.y * v.y)
        if (speed > MAX_FORCE) {
          v.x = (v.x / speed) * MAX_FORCE
          v.y = (v.y / speed) * MAX_FORCE
        }
        p.x += v.x
        p.y += v.y
      }
    }

    setNodes((nds) => nds.map(n => {
      const p = pos.get(n.id)
      return p ? { ...n, position: { x: Math.round(p.x), y: Math.round(p.y) } } : n
    }))

    setTimeout(() => {
      try { fitView({ padding: 0.12, duration: 600 }) } catch {}
    }, 50)
  }, [edges, setNodes, fitView])

  return (
    <div className="flex w-full h-full">
      <div 
        style={{ width: '100%', height: '100%' }} 
        className="flex-1 bg-[#050510] relative"
        onClick={() => setContextMenu(null)}
      >
        {/* Back Button */}
        <div className="absolute top-6 left-6 z-20">
          <Link href="/" className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1e1e2e]/80 border border-[#2e2e3e] text-[#f1f5f9] hover:bg-[#2e2e3e] hover:shadow-lg transition-all backdrop-blur-md" title="Back to Studio">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDoubleClick={onPaneDoubleClick}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          onNodeDoubleClick={(_: React.MouseEvent, node: Node) => {
            setActiveModalNode(node)
            setIsSidebarOpen(true)
          }}
          onNodeContextMenu={onNodeContextMenu}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          deleteKeyCode={['Delete', 'Backspace']}
          fitView
          colorMode="dark"
        >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
        <Controls position="bottom-right" showInteractive={false} className="!bg-[#1e1e2e] !border-[#2e2e3e] !fill-[#f1f5f9]" />
        <MiniMap 
          nodeColor={(n: any) => n.data?.color || '#3F3F46'} 
          maskColor="rgba(5, 5, 16, 0.7)"
          className="!bg-[#0a0a1a] !border-[#1e1e2e]" 
        />
        <Panel position="top-right" className="flex items-center gap-2">
            {isAiLoading && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/50 text-xs font-bold text-indigo-400 animate-pulse">
                <span>🪄</span>
                AI Thinking...
              </div>
            )}
            <button
              onClick={onExplode}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 border border-indigo-400/30 text-xs font-bold text-white shadow-2xl transition-all hover:scale-105 active:scale-95"
              title="Auto-layout: arrange nodes into a clean tree"
            >
              💥 Explode
            </button>
            <div className="px-3 py-1.5 rounded-lg bg-[#1e1e2e] border border-[#2e2e3e] text-xs font-medium text-[#94a3b8] shadow-2xl">
              Double Click — New Node • Right Click — Menu • Delete Key — Remove
            </div>
        </Panel>
      </ReactFlow>
      
      {/* Sidebar Expand Handle */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-1/2 right-0 -translate-y-1/2 w-8 h-16 bg-[#1e1e2e] border-y border-l border-[#2e2e3e] rounded-l-xl z-30 flex items-center justify-center text-[#64748b] hover:text-white hover:bg-[#2e2e3e] shadow-lg transition-all"
        >
          <span className="text-xl">‹</span>
        </button>
      )}
      </div>

      {isSidebarOpen && (
        <div className="flex-shrink-0 relative z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] h-full bg-[#0a0a14] border-l border-[#1e1e2e]">
          {/* Sidebar Collapse Handle */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-1/2 -left-8 -translate-y-1/2 w-8 h-16 bg-[#0a0a14] border-y border-l border-[#1e1e2e] rounded-l-xl z-50 flex items-center justify-center text-[#64748b] hover:text-white hover:bg-[#1e1e2e] transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.2)]"
          >
            <span className="text-xl">›</span>
          </button>
          
          {activeModalNode ? (
            <NodeContentModal 
              isOpen={!!activeModalNode} 
              node={activeModalNode} 
              onClose={() => setActiveModalNode(null)} 
            />
          ) : (
            <div className="w-[360px] h-full flex flex-col items-center justify-center p-8 text-center text-[#64748b]">
              <div className="w-16 h-16 rounded-full bg-[#1e1e2e] flex items-center justify-center mb-4 opacity-50">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-sm font-bold text-[#e2e8f0] mb-2">Select a Node</h3>
              <p className="text-xs leading-relaxed">
                Click on any node in the map to view its details, elaborate its content, or export it to the studio.
              </p>
            </div>
          )}
        </div>
      )}

      {contextMenu && (
        <NodeContextMenu 
          {...contextMenu}
          onClose={() => setContextMenu(null)}
          onOpenModal={setActiveModalNode}
          onAddChild={onAddChild}
          onDelete={onDeleteNode}
          onColorChange={onColorChange}
          onExport={onExportEntity}
          onExpandBranch={onExpandBranch}
          onSuggestGaps={onSuggestGaps}
          onLinkMemory={onLinkMemory}
        />
      )}
    </div>
  )
}

export function ThinkCanvas(props: ThinkCanvasProps) {
  return (
    <ReactFlowProvider>
      <ThinkCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

```

### components/think/think-node.tsx

```tsx
'use client'

import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import type { ThinkNode as ThinkNodeData } from '@/types/mind-map'

export const ThinkNode = memo(({ id, data, selected }: NodeProps) => {
  const { label, color, description, content, metadata, memoryCount, onAddChild, onDelete, onOpenModal } = data as unknown as ThinkNodeData & { 
    memoryCount?: number,
    onAddChild?: (id: string) => void,
    onDelete?: (id: string) => void,
    onOpenModal?: (node: any) => void
  }

  const [isEditing, setIsEditing] = React.useState(false)
  const [editedLabel, setEditedLabel] = React.useState(label)
  const [isRedFlash, setIsRedFlash] = React.useState(false)

  const getBadge = () => {
    if (!metadata?.linkedEntityType) return null;
    switch (metadata.linkedEntityType) {
      case 'goal': return { icon: '⌬', color: 'text-emerald-400', label: 'GOAL' };
      case 'idea': return { icon: '💡', color: 'text-indigo-400', label: 'IDEA' };
      case 'knowledge': return { icon: '📖', color: 'text-amber-400', label: 'KNOW' };
      default: return null;
    }
  };

  const badge = getBadge();

  const handleLabelSubmit = async () => {
    if (editedLabel === label) {
      setIsEditing(false)
      return
    }
    
    try {
      await fetch(`/api/mindmap/nodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editedLabel }),
      })
      // We rely on parent to refresh or just optimistic update here?
      // For now, assume canvas state is updated elsewhere or we just keep local change
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update label:', err)
      setEditedLabel(label)
      setIsEditing(false)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsRedFlash(true)
    setTimeout(() => {
      onDelete?.(id)
    }, 200)
  }

  return (
    <div className={`
      relative group px-3 py-2 min-w-[140px] max-w-[220px]
      bg-[#0a0a1a] border-2 rounded-xl transition-all duration-300 ease-out
      ${selected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#050510] scale-[1.02]' : 'hover:scale-[1.05]'}
      ${isRedFlash ? 'bg-red-900/40 border-red-500' : ''}
    `}
    style={{ borderColor: isRedFlash ? undefined : (color || '#3F3F46') }}>
      
      {/* Node Chrome (Hover) */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
        {/* Delete button */}
        <button 
          className="w-6 h-6 rounded-full bg-[#1e1e2e] border border-red-900/50 text-red-400 flex items-center justify-center text-xs shadow-xl hover:bg-red-900/30 transition-colors"
          onClick={handleDelete}
          title="Delete Node"
        >
          −
        </button>
        
        {/* Details button */}
        <button 
          className="w-6 h-6 rounded-full bg-[#1e1e2e] border border-[#2e2e3e] text-[#94a3b8] flex items-center justify-center text-xs shadow-xl hover:bg-[#2e2e3e] hover:text-white transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal?.({ id, data });
          }}
          title="Edit Details"
        >
          ⋯
        </button>

        {/* Add Child button */}
        <button 
          className="w-6 h-6 rounded-full bg-indigo-600 border border-indigo-400 text-white flex items-center justify-center text-xs shadow-xl hover:bg-indigo-500 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild?.(id);
          }}
          title="Add Child"
        >
          +
        </button>
      </div>

      {/* Target handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-[#27272a] !border-[#3F3F46] !opacity-20 group-hover:!opacity-100 transition-opacity !-top-1.5"
      />

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between h-3">
          <div className="text-[9px] font-bold tracking-tight text-[#94a3b8] uppercase opacity-40">
            {badge?.label || (memoryCount ? 'MEMORIES' : '')}
          </div>
          <div className="flex items-center gap-1.5">
            {memoryCount ? (
              <div className="flex items-center gap-0.5 px-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold text-indigo-400">
                <span>🧠</span>
                {memoryCount}
              </div>
            ) : null}
            {badge && (
              <div className={`text-[10px] ${badge.color} font-bold drop-shadow-sm`}>
                {badge.icon}
              </div>
            )}
          </div>
        </div>
        
        {isEditing ? (
          <input
            autoFocus
            className="w-full bg-transparent font-semibold text-[#f8fafc] text-[13px] leading-tight outline-none border-b border-indigo-500/50"
            value={editedLabel}
            onChange={(e) => setEditedLabel(e.target.value)}
            onBlur={handleLabelSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelSubmit()
              if (e.key === 'Escape') {
                setEditedLabel(label)
                setIsEditing(false)
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div 
            className="font-semibold text-[#f8fafc] text-[13px] leading-tight break-words pr-2 cursor-text"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
          >
            {label}
          </div>
        )}

        {description && (
          <div className="max-h-0 overflow-hidden group-hover:max-h-20 transition-all duration-300">
            <div className="text-[10px] text-[#94a3b8] mt-1.5 leading-relaxed italic border-t border-[#1e1e2e] pt-1.5">
              {description}
            </div>
          </div>
        )}
      </div>

      {/* Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-[#27272a] !border-[#3F3F46] !opacity-20 group-hover:!opacity-100 group-hover:!bg-indigo-500/50 group-hover:!border-indigo-500 transition-all !-bottom-1.5"
      />

      {/* Decorative pulse if selected */}
      {selected && (
        <div className="absolute inset-0 rounded-xl bg-indigo-500/5 animate-pulse pointer-events-none" />
      )}
    </div>
  )
})

ThinkNode.displayName = 'ThinkNode'

```

### components/timeline/TimelineEventCard.tsx

```tsx
'use client'

import { TimelineEntry } from '@/types/timeline'
import { TimePill } from '@/components/common/time-pill'
import Link from 'next/link'

interface TimelineEventCardProps {
  entry: TimelineEntry
}

const categoryColors: Record<string, { dot: string; text: string; bg: string }> = {
  experience: { dot: 'bg-indigo-500', text: 'text-indigo-400', bg: 'hover:border-indigo-500/30' },
  idea: { dot: 'bg-amber-500', text: 'text-amber-400', bg: 'hover:border-amber-500/30' },
  system: { dot: 'bg-slate-500', text: 'text-slate-400', bg: 'hover:border-slate-500/30' },
  github: { dot: 'bg-emerald-500', text: 'text-emerald-400', bg: 'hover:border-emerald-500/30' },
}

export function TimelineEventCard({ entry }: TimelineEventCardProps) {
  const isEphemeral = entry.metadata?.ephemeral === true
  const colors = categoryColors[entry.category] || categoryColors.system

  const content = (
    <div className="relative pl-8 pb-10 group last:pb-0">
      {/* Timeline connector line */}
      <div className="absolute left-[7px] top-6 bottom-0 w-px bg-[#1e1e2e] group-last:hidden" />
      
      {/* Timeline dot */}
      <div className={`absolute left-0 top-1.5 w-[14px] h-[14px] rounded-full border-2 border-[#09090b] ${colors.dot} ring-4 ring-[#09090b] z-10`} />
      
      <div className={`bg-[#12121a] border border-[#1e1e2e] ${colors.bg} rounded-xl p-4 transition-all duration-300 shadow-sm`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] uppercase font-bold tracking-widest ${colors.text}`}>
                {entry.category}
              </span>
              {isEphemeral && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-tighter ring-1 ring-indigo-500/20">
                  ⚡ Ephemeral
                </span>
              )}
              <div className="h-1 w-1 rounded-full bg-[#1e1e2e]" />
              <TimePill dateString={entry.timestamp} />
            </div>
            
            <h3 className="text-sm md:text-base font-semibold text-[#e2e8f0] mb-1 group-hover:text-white transition-colors">
              {entry.title}
            </h3>
            
            {entry.body && (
              <p className="text-xs md:text-sm text-[#94a3b8] leading-relaxed line-clamp-2 mb-3">
                {entry.body}
              </p>
            )}

            {entry.metadata?.stepId && (
              <div className="text-[10px] text-[#475569] font-mono">
                step: {entry.metadata.stepId.split('-')[0]}
              </div>
            )}
          </div>
          
          {entry.actionUrl && (
            <div className={`flex-shrink-0 text-xs font-medium ${colors.text} group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100 flex items-center gap-1`}>
              Open <span className="text-lg">→</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (entry.actionUrl) {
    return (
      <Link href={entry.actionUrl} className="block group no-underline">
        {content}
      </Link>
    )
  }

  return content
}


```

### components/timeline/TimelineFilterBar.tsx

```tsx
'use client'

import { TimelineCategory } from '@/types/timeline'
import { COPY } from '@/lib/studio-copy'

type Filter = 'all' | TimelineCategory

interface TimelineFilterBarProps {
  filter: Filter
  onChange: (filter: Filter) => void
  counts?: {
    all: number
    experience: number
    idea: number
    system: number
    github: number
  }
}

export function TimelineFilterBar({ filter, onChange, counts }: TimelineFilterBarProps) {
  const tabs: { value: Filter; label: string }[] = [
    { value: 'all', label: COPY.experience.timelinePage.filterAll || 'All' },
    { value: 'experience', label: COPY.experience.timelinePage.filterExperiences || 'Experiences' },
    { value: 'idea', label: COPY.experience.timelinePage.filterIdeas || 'Ideas' },
    { value: 'system', label: COPY.experience.timelinePage.filterSystem || 'System' },
    { value: 'github', label: 'GitHub' },
  ]

  return (
    <div className="flex gap-1 p-1 bg-[#12121a] border border-[#1e1e2e] rounded-lg w-fit mb-8">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-3 py-1.5 text-xs rounded transition-colors whitespace-nowrap ${
            filter === tab.value
              ? 'bg-[#1e1e2e] text-[#e2e8f0]'
              : 'text-[#94a3b8] hover:text-[#e2e8f0]'
          }`}
        >
          {tab.label} {counts?.[tab.value as keyof typeof counts] !== undefined && `(${counts[tab.value as keyof typeof counts]})`}
        </button>
      ))}
    </div>
  )
}

```

### lib/adapters/github-adapter.ts

```typescript
/**
 * GitHub Adapter — Provider Boundary
 *
 * Auth strategy:
 * - Phase A (current): Personal Access Token via GITHUB_TOKEN env var
 * - Phase B (future): GitHub App installation token via getGitHubClientForInstallation()
 *
 * All methods in this file use getGitHubClient() which currently resolves from PAT.
 * When migrating to GitHub App, only client.ts needs to change.
 */

import { getGitHubClient } from '@/lib/github/client'
import { getRepoCoordinates, getGitHubConfig } from '@/lib/config/github'

// ---------------------------------------------------------------------------
// Env helpers — delegate to lib/config/github.ts (Lane 1)
// ---------------------------------------------------------------------------

function getOwner(): string {
  return getRepoCoordinates().owner
}

function getRepo(): string {
  return getRepoCoordinates().repo
}

function getDefaultBranch(): string {
  return getGitHubConfig().defaultBranch
}

// ---------------------------------------------------------------------------
// W2 — Connectivity / repo
// ---------------------------------------------------------------------------

export async function validateToken(): Promise<{ valid: boolean; login: string; scopes: string[] }> {
  const octokit = getGitHubClient()
  const response = await octokit.users.getAuthenticated()
  const scopeHeader = (response.headers as Record<string, string | undefined>)['x-oauth-scopes'] ?? ''
  const scopes = scopeHeader
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return { valid: true, login: response.data.login, scopes }
}

export async function getRepoInfo(): Promise<{
  name: string
  full_name: string
  default_branch: string
  private: boolean
}> {
  const octokit = getGitHubClient()
  const { data } = await octokit.repos.get({ owner: getOwner(), repo: getRepo() })
  return {
    name: data.name,
    full_name: data.full_name,
    default_branch: data.default_branch,
    private: data.private,
  }
}

export async function getDefaultBranchName(): Promise<string> {
  const info = await getRepoInfo()
  return info.default_branch
}

// ---------------------------------------------------------------------------
// W3 — Issue methods
// ---------------------------------------------------------------------------

export async function createIssue(params: {
  title: string
  body: string
  labels?: string[]
  assignees?: string[]
}): Promise<{ number: number; url: string }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.issues.create({
    owner: getOwner(),
    repo: getRepo(),
    title: params.title,
    body: params.body,
    labels: params.labels,
    assignees: params.assignees,
  })
  return { number: data.number, url: data.html_url }
}

export async function updateIssue(
  issueNumber: number,
  params: { title?: string; body?: string; state?: 'open' | 'closed' },
): Promise<void> {
  const octokit = getGitHubClient()
  await octokit.issues.update({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
    ...(params.title !== undefined ? { title: params.title } : {}),
    ...(params.body !== undefined ? { body: params.body } : {}),
    ...(params.state !== undefined ? { state: params.state } : {}),
  })
}

export async function addIssueComment(issueNumber: number, body: string): Promise<{ id: number }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.issues.createComment({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
    body,
  })
  return { id: data.id }
}

export async function addIssueLabels(issueNumber: number, labels: string[]): Promise<void> {
  const octokit = getGitHubClient()
  await octokit.issues.addLabels({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
    labels,
  })
}

export async function closeIssue(issueNumber: number): Promise<void> {
  await updateIssue(issueNumber, { state: 'closed' })
}

// ---------------------------------------------------------------------------
// W4 — Pull request methods
// ---------------------------------------------------------------------------

export async function createBranch(
  branchName: string,
  fromSha?: string,
): Promise<{ ref: string }> {
  const octokit = getGitHubClient()
  let sha = fromSha
  if (!sha) {
    // Get the SHA of the default branch head
    const { data: ref } = await octokit.git.getRef({
      owner: getOwner(),
      repo: getRepo(),
      ref: `heads/${getDefaultBranch()}`,
    })
    sha = ref.object.sha
  }
  const { data } = await octokit.git.createRef({
    owner: getOwner(),
    repo: getRepo(),
    ref: `refs/heads/${branchName}`,
    sha,
  })
  return { ref: data.ref }
}

export async function createPullRequest(params: {
  title: string
  body: string
  head: string
  base?: string
  draft?: boolean
}): Promise<{ number: number; url: string }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.create({
    owner: getOwner(),
    repo: getRepo(),
    title: params.title,
    body: params.body,
    head: params.head,
    base: params.base ?? getDefaultBranch(),
    draft: params.draft ?? false,
  })
  return { number: data.number, url: data.html_url }
}

export async function getPullRequest(prNumber: number): Promise<{
  number: number
  title: string
  url: string
  state: string
  head: { sha: string; ref: string }
  base: { ref: string }
  draft: boolean
  mergeable: boolean | null
  merged: boolean
}> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.get({
    owner: getOwner(),
    repo: getRepo(),
    pull_number: prNumber,
  })
  return {
    number: data.number,
    title: data.title,
    url: data.html_url,
    state: data.state,
    head: { sha: data.head.sha, ref: data.head.ref },
    base: { ref: data.base.ref },
    draft: data.draft ?? false,
    mergeable: data.mergeable ?? null,
    merged: data.merged,
  }
}

export async function listPullRequestsForRepo(params?: {
  state?: 'open' | 'closed' | 'all'
}): Promise<Array<{ number: number; title: string; url: string; state: string }>> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.list({
    owner: getOwner(),
    repo: getRepo(),
    state: params?.state ?? 'open',
  })
  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    state: pr.state,
  }))
}

export async function addPullRequestComment(
  prNumber: number,
  body: string,
): Promise<{ id: number }> {
  // PR comments use the issues API
  return addIssueComment(prNumber, body)
}

export async function mergePullRequest(
  prNumber: number,
  params?: { merge_method?: 'merge' | 'squash' | 'rebase'; commit_title?: string },
): Promise<{ sha: string; merged: boolean }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.merge({
    owner: getOwner(),
    repo: getRepo(),
    pull_number: prNumber,
    merge_method: params?.merge_method ?? 'squash',
    commit_title: params?.commit_title,
  })
  return { sha: data.sha ?? '', merged: data.merged }
}

// ---------------------------------------------------------------------------
// W5 — Workflow / Actions methods
// ---------------------------------------------------------------------------

export async function dispatchWorkflow(params: {
  workflowId: string
  ref?: string
  inputs?: Record<string, string>
}): Promise<void> {
  const octokit = getGitHubClient()
  await octokit.actions.createWorkflowDispatch({
    owner: getOwner(),
    repo: getRepo(),
    workflow_id: params.workflowId,
    ref: params.ref ?? getDefaultBranch(),
    inputs: params.inputs ?? {},
  })
}

export async function getWorkflowRun(runId: number): Promise<{
  id: number
  name: string | null
  status: string | null
  conclusion: string | null
  url: string
  headSha: string
}> {
  const octokit = getGitHubClient()
  const { data } = await octokit.actions.getWorkflowRun({
    owner: getOwner(),
    repo: getRepo(),
    run_id: runId,
  })
  return {
    id: data.id,
    name: data.name ?? null,
    status: data.status ?? null,
    conclusion: data.conclusion ?? null,
    url: data.html_url,
    headSha: data.head_sha,
  }
}

export async function listWorkflowRuns(params?: {
  workflowId?: string
  status?: string
  perPage?: number
}): Promise<
  Array<{
    id: number
    name: string | null
    status: string | null
    conclusion: string | null
    url: string
  }>
> {
  const octokit = getGitHubClient()

  if (params?.workflowId) {
    const { data } = await octokit.actions.listWorkflowRuns({
      owner: getOwner(),
      repo: getRepo(),
      workflow_id: params.workflowId,
      per_page: params.perPage ?? 10,
    })
    return data.workflow_runs.map((run) => ({
      id: run.id,
      name: run.name ?? null,
      status: run.status ?? null,
      conclusion: run.conclusion ?? null,
      url: run.html_url,
    }))
  }

  const { data } = await octokit.actions.listWorkflowRunsForRepo({
    owner: getOwner(),
    repo: getRepo(),
    per_page: params?.perPage ?? 10,
  })
  return data.workflow_runs.map((run) => ({
    id: run.id,
    name: run.name ?? null,
    status: run.status ?? null,
    conclusion: run.conclusion ?? null,
    url: run.html_url,
  }))
}

// ---------------------------------------------------------------------------
// W6 — Copilot handoff
// ---------------------------------------------------------------------------

/** Stable GraphQL node ID for the Copilot bot account. */
const COPILOT_BOT_NODE_ID = 'BOT_kgDOC9w8XQ'

/**
 * Get the GraphQL node ID for an issue (needed for GraphQL mutations).
 */
export async function getIssueNodeId(issueNumber: number): Promise<string> {
  const octokit = getGitHubClient()
  const { data } = await octokit.issues.get({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
  })
  return data.node_id
}

/**
 * Assign Copilot coding agent via GraphQL with model selection.
 *
 * Uses the `addAssigneesToAssignable` mutation with `agentAssignment`
 * and the required `GraphQL-Features: issues_copilot_assignment_api_support` header.
 *
 * This is the most reliable way to trigger Copilot with a specific model.
 */
export async function assignCopilotViaGraphQL(params: {
  issueNodeId: string
  model?: string
  customInstructions?: string
  baseRef?: string
}): Promise<{ success: boolean; assignees: string[] }> {
  const config = getGitHubConfig()
  const token = config.token

  const query = `
    mutation($input: AddAssigneesToAssignableInput!) {
      addAssigneesToAssignable(input: $input) {
        assignable {
          ... on Issue {
            number
            assignees(first: 5) { nodes { login } }
          }
        }
      }
    }
  `

  const agentAssignment: Record<string, string> = {}
  if (params.model) agentAssignment.customAgent = params.model
  if (params.customInstructions) agentAssignment.customInstructions = params.customInstructions
  if (params.baseRef) agentAssignment.baseRef = params.baseRef

  const variables = {
    input: {
      assignableId: params.issueNodeId,
      assigneeIds: [COPILOT_BOT_NODE_ID],
      ...(Object.keys(agentAssignment).length > 0 ? { agentAssignment } : {}),
    },
  }

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'GraphQL-Features': 'issues_copilot_assignment_api_support',
    },
    body: JSON.stringify({ query, variables }),
  })

  const data = await res.json()

  if (data.errors) {
    const msg = data.errors[0]?.message ?? 'Unknown GraphQL error'
    throw new Error(`[github-adapter] assignCopilotViaGraphQL failed: ${msg}`)
  }

  const nodes = data.data.addAssigneesToAssignable.assignable.assignees.nodes
  return {
    success: true,
    assignees: nodes.map((n: { login: string }) => n.login),
  }
}

/**
 * Trigger Copilot via PR-comment — the most reliable method.
 *
 * Flow:
 * 1. Create branch `copilot/issue-<num>` from default branch
 * 2. Create a draft PR linking to the issue
 * 3. Post `@copilot` comment with task instructions
 *
 * This bypasses PAT/OAuth issues because @copilot mentions on PRs
 * route through a different, more reliable product surface.
 */
export async function triggerCopilotViaPR(params: {
  issueNumber: number
  issueTitle: string
  issueBody: string
  model?: string
  customInstructions?: string
}): Promise<{ prNumber: number; prUrl: string; branchName: string }> {
  const octokit = getGitHubClient()
  const owner = getOwner()
  const repo = getRepo()
  const branchName = `copilot/issue-${params.issueNumber}`

  // Step 1: Create branch from default branch
  const { data: mainRef } = await octokit.git.getRef({
    owner, repo, ref: `heads/${getDefaultBranch()}`,
  })
  const baseSha = mainRef.object.sha

  await octokit.git.createRef({
    owner, repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  })

  // Step 2: Add a placeholder commit (PR needs at least 1 diff commit)
  const taskContent = [
    `# Copilot Task: Issue #${params.issueNumber}`,
    '',
    `**${params.issueTitle}**`,
    '',
    params.issueBody,
    '',
    `> This file was created to bootstrap the Copilot coding agent.`,
  ].join('\n')

  const { data: blob } = await octokit.git.createBlob({
    owner, repo,
    content: Buffer.from(taskContent).toString('base64'),
    encoding: 'base64',
  })

  const { data: baseCommit } = await octokit.git.getCommit({
    owner, repo, commit_sha: baseSha,
  })

  const { data: tree } = await octokit.git.createTree({
    owner, repo,
    base_tree: baseCommit.tree.sha,
    tree: [{ path: '.copilot-task.md', mode: '100644', type: 'blob', sha: blob.sha }],
  })

  const { data: newCommit } = await octokit.git.createCommit({
    owner, repo,
    message: `chore: bootstrap Copilot task for issue #${params.issueNumber}`,
    tree: tree.sha,
    parents: [baseSha],
  })

  await octokit.git.updateRef({
    owner, repo,
    ref: `heads/${branchName}`,
    sha: newCommit.sha,
  })

  // Step 3: Create draft PR
  const prBody = [
    `Resolves #${params.issueNumber}`,
    '',
    '---',
    `**Issue:** ${params.issueTitle}`,
    '',
    params.issueBody,
  ].join('\n')

  const pr = await createPullRequest({
    title: `[Copilot] ${params.issueTitle}`,
    body: prBody,
    head: branchName,
    draft: true,
  })

  // Step 3: Trigger Copilot via @copilot mention
  const commentParts = [
    `@copilot Please work on this task.`,
    '',
    `## Instructions`,
    params.issueBody,
  ]
  if (params.model) {
    commentParts.push('', `**Preferred model:** ${params.model}`)
  }
  if (params.customInstructions) {
    commentParts.push('', `## Additional Instructions`, params.customInstructions)
  }

  await addPullRequestComment(pr.number, commentParts.join('\n'))

  return {
    prNumber: pr.number,
    prUrl: pr.url,
    branchName,
  }
}

/**
 * @deprecated Use assignCopilotViaGraphQL() or triggerCopilotViaPR() instead.
 * REST API silently drops Copilot assignees. Kept for backwards compatibility.
 */
export async function assignCopilotToIssue(issueNumber: number): Promise<void> {
  try {
    const octokit = getGitHubClient()
    await octokit.issues.addAssignees({
      owner: getOwner(),
      repo: getRepo(),
      issue_number: issueNumber,
      assignees: ['copilot-swe-agent'],
    })
  } catch (err) {
    console.warn(
      `[github-adapter] assignCopilotToIssue: Copilot not available for issue #${issueNumber}. Skipping.`,
      err,
    )
  }
}

```

### lib/adapters/gpt-adapter.ts

```typescript
import type { Idea } from '@/types/idea'

export interface GPTIdeaPayload {
  userId?: string
  title: string
  rawPrompt: string
  gptSummary: string
  vibe?: string
  audience?: string
  intent?: string
}

export function parseGPTPayload(payload: GPTIdeaPayload): Omit<Idea, 'id' | 'created_at' | 'status'> {
  return {
    userId: payload.userId ?? '',
    title: payload.title,
    rawPrompt: payload.rawPrompt,
    gptSummary: payload.gptSummary,
    vibe: payload.vibe ?? 'unknown',
    audience: payload.audience ?? 'unknown',
    intent: payload.intent ?? '',
  }
}

```

### lib/adapters/notifications-adapter.ts

```typescript
import type { InboxEvent } from '@/types/inbox'
import { getInboxEvents, markRead } from '@/lib/services/inbox-service'

export async function fetchInboxEvents(): Promise<InboxEvent[]> {
  return getInboxEvents()
}

export async function markEventRead(eventId: string): Promise<void> {
  return markRead(eventId)
}

```

### lib/adapters/vercel-adapter.ts

```typescript
import { getProjectById } from '@/lib/services/projects-service'

export async function fetchPreviewUrl(projectId: string): Promise<string | null> {
  const project = await getProjectById(projectId)
  return project?.activePreviewUrl ?? null
}

export async function fetchDeploymentStatus(_projectId: string): Promise<string> {
  return 'ready'
}

```

### lib/ai/context/facet-context.ts

```typescript
import { getExperienceInstanceById, getExperienceSteps } from '@/lib/services/experience-service';
import { getInteractionsByInstance } from '@/lib/services/interaction-service';
import { getFacetsForUser } from '@/lib/services/facet-service';

/**
 * buildFacetContext(instanceId, userId) assembles the input for the facet extraction flow.
 * 1. Fetches experience instance, steps, and interaction events.
 * 2. Fetches existing facets for the user to help deduplicate or refine.
 * 3. Maps each step along with any relevant user content/responses.
 */
export async function buildFacetContext(instanceId: string, userId: string) {
  const [instance, steps, interactions, existingFacets] = await Promise.all([
    getExperienceInstanceById(instanceId),
    getExperienceSteps(instanceId),
    getInteractionsByInstance(instanceId),
    getFacetsForUser(userId)
  ]);

  if (!instance) {
    throw new Error(`Experience instance not found: \${instanceId}`);
  }

  // Group interactions by stepId
  const interactionsByStep = interactions.reduce((acc, interaction) => {
    if (interaction.step_id) {
      if (!acc[interaction.step_id]) {
        acc[interaction.step_id] = [];
      }
      acc[interaction.step_id].push(interaction);
    }
    return acc;
  }, {} as Record<string, any[]>);

  const stepSummaries = steps.map((step) => {
    const relevantEvents = interactionsByStep[step.id] || [];
    
    // Concatenate all meaningful user responses into a single string
    let responses: string[] = [];
    
    relevantEvents.forEach((event) => {
      const payload = event.event_payload;
      if (!payload) return;

      // standard answer_submitted payload (answers map or reflections map)
      const answerMap = payload.answers || payload.reflections;
      if (answerMap && typeof answerMap === 'object') {
        Object.values(answerMap).forEach((val) => {
          if (typeof val === 'string' && val.trim().length > 0) {
            responses.push(val);
          }
        });
      }

      // task_completed or draft_saved might have content/proof
      if (typeof payload.content === 'string' && payload.content.trim().length > 0) {
        responses.push(payload.content);
      }
      if (typeof payload.proof === 'string' && payload.proof.trim().length > 0) {
        responses.push(payload.proof);
      }
      
      // Generic 'response' field used in some newer interactive step captures
      if (typeof payload.response === 'string' && payload.response.trim().length > 0) {
        responses.push(payload.response);
      }
    });

    return {
      title: step.title,
      type: step.step_type,
      userResponse: responses.length > 0 ? responses.join('\n\n') : undefined
    };
  });

  return {
    experienceTitle: instance.title,
    experienceGoal: instance.goal,
    stepSummaries,
    existingFacets: existingFacets.map(f => ({
      type: f.facet_type as string,
      value: f.value,
      confidence: f.confidence
    }))
  };
}

```

### lib/ai/context/suggestion-context.ts

```typescript
import { buildUserProfile } from '@/lib/services/facet-service';
import { getExperienceInstances, getExperienceTemplates, getExperienceInstanceById } from '@/lib/services/experience-service';

export async function buildSuggestionContext(userId: string, justCompletedInstanceId?: string) {
  const profile = await buildUserProfile(userId);
  const instances = await getExperienceInstances({ userId });
  const templates = await getExperienceTemplates();

  // Completed experience classes
  const completedInstances = instances.filter(i => i.status === 'completed');
  // Need to map instance template_id to template class
  const templateMap = Object.fromEntries(templates.map(t => [t.id, t.class]));
  const completedExperienceClasses = Array.from(new Set(
    completedInstances.map(i => templateMap[i.template_id]).filter(Boolean)
  ));

  let justCompletedTitle: string | undefined;
  let frictionLevel: string | undefined;

  if (justCompletedInstanceId) {
    const instance = await getExperienceInstanceById(justCompletedInstanceId);
    if (instance) {
      justCompletedTitle = instance.title;
      // We can infer friction level from telemetry if available, 
      // but for now we look at the instance metadata if it exists.
      // Progression engine handles real friction math.
      frictionLevel = instance.friction_level || 'normal';
    }
  }

  return {
    userId,
    justCompletedTitle,
    completedExperienceClasses,
    userInterests: profile.topInterests,
    userSkills: profile.topSkills,
    activeGoals: profile.activeGoals,
    frictionLevel,
    availableTemplateClasses: Array.from(new Set(templates.map(t => t.class)))
  };
}

```

### lib/ai/flows/board-macros.ts

```typescript
import { ai } from '../genkit';
import { z } from 'zod';
import { 
  BoardFromTextOutputSchema, 
  ExpandBoardBranchOutputSchema, 
  SuggestBoardGapsOutputSchema 
} from '../schemas';
import { getBoardGraph } from '@/lib/services/mind-map-service';

/**
 * boardFromTextFlow - Lane 4
 * Generates a full mind map structure from a textual prompt.
 */
export const boardFromTextFlow = ai.defineFlow(
  {
    name: 'boardFromTextFlow',
    inputSchema: z.object({ prompt: z.string(), userId: z.string() }),
    outputSchema: BoardFromTextOutputSchema,
  },
  async (input) => {
    const { prompt } = input;
    
    const systemPrompt = `
      System: You are Mira Studio's Mind Map Architect. 
      Task: Convert a user's goal or topic into a structured mind map.
      Guidelines:
      1. Create a root node.
      2. Branch out into 4-6 primary categories.
      3. For each category, add 2-3 supporting nodes.
      4. Use coordinates (x, y) relative to root (0,0). Root is always type='root'.
      5. Use parentLabel to indicate the hierarchy for edge creation.
    `;
    
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: `${systemPrompt}\n\nUser Request: "${prompt}"`,
      output: { schema: BoardFromTextOutputSchema }
    });
    
    if (!output) throw new Error('AI failed to generate board structure');
    return output;
  }
);

/**
 * expandBranchFlow - Lane 4
 * Suggests new nodes to expand a specific branch in an existing mind map.
 */
export const expandBranchFlow = ai.defineFlow(
  {
    name: 'expandBranchFlow',
    inputSchema: z.object({ boardId: z.string(), nodeId: z.string(), userId: z.string() }),
    outputSchema: ExpandBoardBranchOutputSchema,
  },
  async (input) => {
    const { boardId, nodeId } = input;
    
    // Fetch current graph for context
    const { nodes } = await getBoardGraph(boardId);
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) throw new Error(`Node ${nodeId} not found`);

    const context = nodes.map(n => `- ${n.label}${n.id === nodeId ? ' [TARGET]' : ''}`).join('\n');
    
    const systemPrompt = `
      System: You are an Intellectual Expansion Agent.
      Task: Suggest 3-5 new nodes to expand the specific branch starting at the [TARGET] node.
      
      EXISTING NODES:
      ${context}
      
      Guidelines:
      1. Ensure new nodes are logically downstream or related to "${targetNode.label}".
      2. Suggest coordinates (x, y) that are physically near the target node but not overlapping.
      3. Use parentNodeId="${nodeId}" for all new nodes.
    `;
    
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: systemPrompt,
      output: { schema: ExpandBoardBranchOutputSchema }
    });
    
    if (!output) throw new Error('AI failed to expand branch');
    return output;
  }
);

/**
 * suggestGapsFlow - Lane 4
 * Identifies missing perspectives or logical gaps in an existing mind map.
 */
export const suggestGapsFlow = ai.defineFlow(
  {
    name: 'suggestGapsFlow',
    inputSchema: z.object({ boardId: z.string(), userId: z.string() }),
    outputSchema: SuggestBoardGapsOutputSchema,
  },
  async (input) => {
    const { boardId } = input;
    
    const { nodes } = await getBoardGraph(boardId);
    const context = nodes.map(n => `- ${n.label}: ${n.description}`).join('\n');
    
    const systemPrompt = `
      System: You are a Cognitive Gap Analyst.
      Task: Analyze the following mind map nodes and identify 3 missing logical gaps or perspectives.
      
      CURRENT MAP CONTENT:
      ${context}
      
      Analysis Requirements:
      1. What critical angle is being ignored?
      2. Why is this gap important for the user's apparent goal?
      3. Suggest a node label that would bridge this gap.
    `;
    
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: systemPrompt,
      output: { schema: SuggestBoardGapsOutputSchema }
    });
    
    if (!output) throw new Error('AI failed to suggest gaps');
    return output;
  }
);

```

### lib/ai/flows/compress-gpt-state.ts

```typescript
import { ai } from '../genkit';
import { z } from 'zod';
import { CompressedStateOutputSchema } from '../schemas';

export const compressGPTStateFlow = ai.defineFlow(
  {
    name: 'compressGPTStateFlow',
    inputSchema: z.object({
      rawStateJSON: z.string().describe('The full GPT state packet as JSON string'),
      tokenBudget: z.number().default(800).describe('Target compressed output length in tokens')
    }),
    outputSchema: CompressedStateOutputSchema,
  },
  async (input) => {
    const { rawStateJSON, tokenBudget } = input;
    
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: `You are a state compression specialist for Mira Studio.
        Identify the user's active Goal, overall domain mastery, and recent progress.
        Maintain technical accuracy for IDs and counts.
        Focus on user intent, engagement level (friction), and alignment with their Goal.
        Compress the narrative to fit within ${tokenBudget} tokens.
        Highlight 3-5 priority signals.
        Suggest a single opening topic for the GPT's next message that advances the current Goal.`,
      prompt: `Compress this raw mirror state into a high-signal narrative for the user's workspace: ${rawStateJSON}`,
      output: {
        schema: CompressedStateOutputSchema
      }
    });

    if (!output) {
      throw new Error('Failed to generate compressed state');
    }

    return output;
  }
);

```

### lib/ai/flows/extract-facets.ts

```typescript
import { z } from 'zod';
import { ai } from '../genkit';
import { FacetExtractionOutputSchema } from '../schemas';

export const ExtractFacetsInputSchema = z.object({
  experienceTitle: z.string(),
  experienceGoal: z.string().optional(),
  stepSummaries: z.array(z.object({
    title: z.string(),
    type: z.string(),
    userResponse: z.string().optional()
  })),
  existingFacets: z.array(z.object({
    type: z.string(),
    value: z.string(),
    confidence: z.number()
  }))
});

export const extractFacetsFlow = ai.defineFlow(
  {
    name: 'extractFacetsFlow',
    inputSchema: ExtractFacetsInputSchema,
    outputSchema: FacetExtractionOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are an AI coach for Mira Studio. Extract user profile facets based on their responses to an experience.
      
      Experience Context:
      - Title: ${input.experienceTitle}
      - Goal: ${input.experienceGoal || 'Not specified'}
      
      User Interactions:
      ${input.stepSummaries.map(s => `Step: ${s.title} (${s.type})\nUser Response: ${s.userResponse || 'No response'}`).join('\n\n')}
      
      Existing Facets for this user:
      ${input.existingFacets.map(f => `- ${f.type}: ${f.value} (confidence: ${f.confidence})`).join('\n')}
      
      Task:
      Analyze the user's responses and the experience context to extract new or updated profile facets.
      Facets should belong to one of these types:
      - interest: user reveals a topical interest (e.g. sustainable business models, career change)
      - skill: user demonstrates a skill (e.g. analytical thinking, networking, writing)
      - goal: user states or implies a goal (e.g. build something, learn a new framework)
      - preferred_mode: user shows preference for a certain mode (practice, deep_work, immersive)
      - preferred_depth: user shows preference for a certain depth (light, medium, heavy)
      - friction_pattern: observed resistance or ease (e.g. struggles with planning, excels at creative tasks)
      
      Guidelines:
      1. Be specific. Instead of "Interested in tech", use "Interested in sustainable business models".
      2. Set confidence based on strength of evidence (0.0 to 1.0).
      3. For each facet, provide a brief "evidence" string explaining why you extracted it.
      4. Compare with existing facets; if a facet already exists but the new evidence is stronger, update it.
      
      Output the facets in the provided structured format.
    `;

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: FacetExtractionOutputSchema }
    });

    return output || { facets: [] };
  }
);

```

### lib/ai/flows/grade-checkpoint-flow.ts

```typescript
import { ai } from '../genkit';
import { GradeCheckpointInputSchema, GradeCheckpointOutputSchema } from '../schemas';

/**
 * gradeCheckpointFlow - Lane 5
 * Semantically grades a learner's free-text checkpoint answer against the
 * expected answer + unit context. Returns a grading verdict with feedback
 * and, if wrong, identifies the specific misconception.
 */
export const gradeCheckpointFlow = ai.defineFlow(
  {
    name: 'gradeCheckpointFlow',
    inputSchema: GradeCheckpointInputSchema,
    outputSchema: GradeCheckpointOutputSchema,
  },
  async (input) => {
    const { question, expectedAnswer, userAnswer, unitContext } = input;

    const prompt = `
System: You are a precise but encouraging educational grader for Mira Studio.
Your job: grade the learner's answer semantically — not word-for-word. A substantially correct answer should pass even if phrased differently.

QUESTION: ${question}
EXPECTED ANSWER: ${expectedAnswer}
LEARNER'S ANSWER: ${userAnswer}
${unitContext ? `\nKNOWLEDGE CONTEXT (for reference):\n${unitContext}` : ''}

Grade this answer:
1. Is the learner's answer substantially correct? (true/false)
2. Write brief, encouraging feedback (1–2 sentences). If correct, affirm what they got right. If wrong, explain the gap gently.
3. If wrong, identify the specific misconception in one short phrase.
4. Rate your confidence in this verdict from 0.0 to 1.0.
    `.trim();

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: GradeCheckpointOutputSchema },
    });

    if (!output) throw new Error('AI failed to grade checkpoint answer');

    return output;
  }
);

```

### lib/ai/flows/refine-knowledge-flow.ts

```typescript
import { ai } from '../genkit';
import { z } from 'zod';
import { KnowledgeEnrichmentOutputSchema } from '../schemas';
import { getKnowledgeUnitById } from '@/lib/services/knowledge-service';

/**
 * refineKnowledgeFlow - Lane 2
 * Implements intelligent enrichment for knowledge units.
 */
export const refineKnowledgeFlow = ai.defineFlow(
  {
    name: 'refineKnowledgeFlow',
    inputSchema: z.object({ unitId: z.string(), userId: z.string() }),
    outputSchema: KnowledgeEnrichmentOutputSchema,
  },
  async (input) => {
    const { unitId } = input;
    
    // 1. Fetch the unit
    const unit = await getKnowledgeUnitById(unitId);
    if (!unit) throw new Error(`Knowledge unit ${unitId} not found`);
    
    // 2. Build prompt context
    const prompt = `
      System: You are an educational content engineer for Mira Studio.
      Task: Given a knowledge unit with a thesis and content, generate high-density enrichment artifacts.
      
      KNOWLEDGE UNIT:
      Title: "${unit.title}"
      Topic: "${unit.topic}"
      Domain: "${unit.domain}"
      Thesis: "${unit.thesis}"
      Content: "${unit.content}"
      Key Ideas: ${unit.key_ideas.join(', ')}
      
      Requirements:
      1. Retrieval Questions: Generate 3-5 questions that test deep understanding of the thesis and content. Assign a difficulty level (easy, medium, hard).
      2. Cross-domain Links: Identify 2-3 related professional or educational domains where this knowledge is applicable. Explain why.
      3. Skill Tags: Suggest 5-7 specific skill tags (e.g., "SaaS Dynamics", "Unit Economics", "Product Market Fit") related to this content.
    `;
    
    // 3. Generate output
    const { output } = await ai.generate({
      // Use gemini-2.5-flash as the standard model for enrichment
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: KnowledgeEnrichmentOutputSchema }
    });
    
    if (!output) throw new Error('AI failed to generate knowledge enrichment');
    
    return output;
  }
);

```

### lib/ai/flows/suggest-next-experience.ts

```typescript
import { z } from 'zod';
import { ai } from '../genkit';
import { SuggestionOutputSchema } from '../schemas';

export const SuggestNextExperienceInputSchema = z.object({
  userId: z.string(),
  justCompletedTitle: z.string().optional(),
  completedExperienceClasses: z.array(z.string()),
  userInterests: z.array(z.string()),
  userSkills: z.array(z.string()),
  activeGoals: z.array(z.string()),
  frictionLevel: z.string().optional(),
  availableTemplateClasses: z.array(z.string())
});

export const suggestNextExperienceFlow = ai.defineFlow(
  {
    name: 'suggestNextExperienceFlow',
    inputSchema: SuggestNextExperienceInputSchema,
    outputSchema: SuggestionOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are an AI coach for Mira Studio. Suggest 2-3 context-aware next experiences for the user.
      
      User Profile:
      - Interests: ${input.userInterests.join(', ')}
      - Skills: ${input.userSkills.join(', ')}
      - Active Goals: ${input.activeGoals.join(', ')}
      
      User History:
      - Completed experience classes: ${input.completedExperienceClasses.join(', ')}
      ${input.justCompletedTitle ? `- Just completed: ${input.justCompletedTitle}` : ''}
      - Observed friction level: ${input.frictionLevel || 'normal'}
      
      Available next experience types (template classes):
      ${input.availableTemplateClasses.join(', ')}
      
      Criteria for suggestions:
      1. Alignment with user goals and interests.
      2. Logical progression based on history.
      3. Adapt for friction: if high, suggest lighter-weight (mode: practice, depth: light) experiences.
      4. Diversity: dont just suggest the same class repeatedly.
      
      Provide your reasoning for each suggestion. Each suggestedResolution must include:
      - depth: 'light' | 'medium' | 'heavy'
      - mode: 'practice' | 'deep_work' | 'immersive'
      - timeScope: 'immediate' | 'session' | 'multi_day' | 'ongoing'
      - intensity: 'chill' | 'focused' | 'intense'
    `;

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: SuggestionOutputSchema }
    });

    if (!output) {
      return { suggestions: [] };
    }

    return output;
  }
);

```

### lib/ai/flows/synthesize-experience.ts

```typescript
import { ai } from '../genkit';
import { z } from 'zod';
import { SynthesisOutputSchema } from '../schemas';
import { getInteractionsByInstance } from '@/lib/services/interaction-service';
import { getExperienceInstanceById, getExperienceSteps } from '@/lib/services/experience-service';

/**
 * synthesizeExperienceFlow - Lane 1
 * Implements intelligent narrative synthesis for a completed experience.
 */
export const synthesizeExperienceFlow = ai.defineFlow(
  {
    name: 'synthesizeExperienceFlow',
    inputSchema: z.object({ instanceId: z.string(), userId: z.string() }),
    outputSchema: SynthesisOutputSchema,
  },
  async (input) => {
    const { instanceId } = input;
    
    // 1. Fetch data
    const instance = await getExperienceInstanceById(instanceId);
    if (!instance) throw new Error(`Experience instance ${instanceId} not found`);
    
    const steps = await getExperienceSteps(instanceId);
    const interactions = await getInteractionsByInstance(instanceId);
    
    // 2. Build prompt context
    const stepSummary = steps.map(s => `${s.step_order + 1}. [${s.step_type}] ${s.title}`).join('\n');
    const interactionSummary = interactions.map(i => {
      const type = i.event_type;
      // Truncate large payloads (e.g. 100-question answer blobs) to avoid prompt overflow
      if (type === 'answer_submitted' && i.event_payload?.answers) {
        const answers = i.event_payload.answers;
        const keys = Object.keys(answers);
        const sample = keys.slice(0, 10).map(k => `${k}: ${String(answers[k]).substring(0, 80)}`).join('; ');
        return `- Event: ${type} | ${keys.length} answers submitted (sample: ${sample})`;
      }
      const payload = JSON.stringify(i.event_payload);
      return `- Event: ${type} | Payload: ${payload.length > 200 ? payload.substring(0, 200) + '...' : payload}`;
    }).join('\n');
    
    // Cap total interaction context to prevent prompt overflow
    const maxInteractionChars = 4000;
    const trimmedInteractions = interactionSummary.length > maxInteractionChars
      ? interactionSummary.substring(0, maxInteractionChars) + '\n... (truncated)'
      : interactionSummary;
    
    const prompt = `
      System: You are an experience analyst for Mira Studio.
      Task: Synthesize a user's journey through a structured experience.
      
      EXPERIENCE:
      Title: "${instance.title}"
      Goal: "${instance.goal || 'Not specified'}"
      Resolution: ${JSON.stringify(instance.resolution)}
      
      STRUCTURE:
      ${stepSummary}
      
      USER ACTIVITY:
      ${trimmedInteractions}
      
      Analysis Requirements:
      1. Provide a narrative (2-3 sentences) on what actually happened.
      2. Extract 3-5 behavioral signals (e.g., fast completion, deep reflections, specific interests).
      3. Assess friction: was it too hard, too easy, or just right?
      4. Suggest 2-3 next experience paths based on their output.
    `;
    
    // 3. Generate output
    const { output } = await ai.generate({
      // Use gemini-2.0-flash as the fast model for frequently-called flows
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: SynthesisOutputSchema }
    });
    
    if (!output) throw new Error('AI failed to generate synthesis');
    
    return output;
  }
);

```

### lib/ai/flows/tutor-chat-flow.ts

```typescript
import { ai } from '../genkit';
import { TutorChatInputSchema, TutorChatOutputSchema } from '../schemas';

/**
 * tutorChatFlow - Lane 5
 * Scoped conversational tutor that answers questions about the current step's
 * linked knowledge unit. Not a general chatbot — context is always bounded to
 * the active step + knowledge unit.
 */
export const tutorChatFlow = ai.defineFlow(
  {
    name: 'tutorChatFlow',
    inputSchema: TutorChatInputSchema,
    outputSchema: TutorChatOutputSchema,
  },
  async (input) => {
    const { knowledgeUnitContent, conversationHistory, userMessage } = input;

    // Build conversation history into a readable string
    const historyText = conversationHistory
      .map((turn) => `${turn.role === 'user' ? 'Learner' : 'Tutor'}: ${turn.content}`)
      .join('\n');

    const prompt = `
System: You are a focused, concise tutor embedded inside a learning workspace for Mira Studio.
Your job: answer the learner's question about the current topic only. Do NOT go off-topic.
If the learner seems confused, signal "struggling". If they're asking good questions, signal "progressing". If they show real understanding, signal "confident".
Always suggest a short follow-up question to deepen their thinking.

KNOWLEDGE UNIT CONTENT:
${knowledgeUnitContent}

${historyText ? `CONVERSATION SO FAR:\n${historyText}\n` : ''}
Learner: ${userMessage}

Respond as the Tutor. Be concise (2–4 sentences max). After your answer, set masterySignal to your best read of the learner's current understanding level. Include a suggestedFollowup question.
    `.trim();

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: TutorChatOutputSchema },
    });

    if (!output) throw new Error('AI failed to generate tutor response');

    return output;
  }
);

```

### lib/ai/genkit.ts

```typescript
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
});

export { googleAI };

```

### lib/ai/safe-flow.ts

```typescript
/**
 * Wraps a Genkit flow execution with error handling and API key checks.
 * Returns the flow result or a fallback if it fails.
 */
export async function runFlowSafe<TInput, TOutput>(
  flow: { run: (input: TInput) => Promise<TOutput> },
  input: TInput,
  handler?: (output: TOutput) => Promise<any>
): Promise<any> {
  try {
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENAI_API_KEY) {
      console.warn('AI API Key is not set. Flow execution skipped.');
      return null;
    }
    
    const output = await flow.run(input);
    
    if (handler) {
      return await handler(output);
    }
    
    return output;
  } catch (error: any) {
    console.error(`[AI/safe-flow] Flow execution failed:`, error.message);
    return null;
  }
}

```

### lib/ai/schemas.ts

```typescript
import { z } from 'zod';

export const SynthesisOutputSchema = z.object({
  narrative: z.string().describe('2-3 sentence summary of what happened and what it means'),
  keySignals: z.array(z.string()).describe('3-5 key behavioral signals observed'),
  frictionAssessment: z.string().describe('One sentence: was the user engaged, struggling, or coasting?'),
  nextCandidates: z.array(z.string()).describe('2-3 suggested next experience types with reasoning')
});

export const FacetExtractionOutputSchema = z.object({
  facets: z.array(z.object({
    facetType: z.enum(['interest', 'skill', 'goal', 'preferred_mode', 'preferred_depth', 'friction_pattern']),
    value: z.string(),
    confidence: z.number().min(0).max(1),
    evidence: z.string()
  }))
});

export const SuggestionOutputSchema = z.object({
  suggestions: z.array(z.object({
    templateClass: z.string(),
    reason: z.string(),
    confidence: z.number(),
    suggestedResolution: z.object({
      depth: z.string(),
      mode: z.string(),
      timeScope: z.string(),
      intensity: z.string()
    })
  }))
});

export const CompressedStateOutputSchema = z.object({
  compressedNarrative: z.string().describe('Token-efficient narrative summary of user state'),
  prioritySignals: z.array(z.string()).describe('Top 3-5 signals the GPT should act on'),
  suggestedOpeningTopic: z.string().describe('What the GPT should bring up first')
});

export const KnowledgeEnrichmentOutputSchema = z.object({
  retrieval_questions: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
  })),
  cross_links: z.array(z.object({
    related_domain: z.string(),
    reason: z.string(),
  })),
  skill_tags: z.array(z.string()),
});

// --- Lane 5: Tutor Chat + Checkpoint Grading Schemas ---

export const TutorChatInputSchema = z.object({
  stepId: z.string(),
  knowledgeUnitContent: z.string().describe('Full content of the linked knowledge unit'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).describe('Prior turns in this tutoring session'),
  userMessage: z.string().describe('The learner\'s latest question or message'),
});

export const TutorChatOutputSchema = z.object({
  response: z.string().describe('The tutor\'s concise, contextual answer'),
  masterySignal: z.enum(['struggling', 'progressing', 'confident']).optional()
    .describe('Signal inferred from learner\'s message about their comprehension level'),
  suggestedFollowup: z.string().optional()
    .describe('A follow-up question the tutor could pose to deepen understanding'),
});

export const GradeCheckpointInputSchema = z.object({
  question: z.string().describe('The checkpoint question that was asked'),
  expectedAnswer: z.string().describe('The canonical correct answer'),
  userAnswer: z.string().describe('What the learner wrote'),
  unitContext: z.string().optional().describe('Relevant knowledge unit content for grading context'),
});

export const GradeCheckpointOutputSchema = z.object({
  correct: z.boolean().describe('Whether the answer is substantially correct'),
  feedback: z.string().describe('Brief, encouraging feedback explaining the grade'),
  misconception: z.string().optional().describe('The specific misconception if the answer is wrong'),
  confidence: z.number().min(0).max(1).describe('Grader\'s confidence in this verdict (0–1)'),
});

// --- Lane 4: Board Macro Actions Schemas ---

export const BoardFromTextOutputSchema = z.object({
  title: z.string().describe('Suggested name for the new board'),
  nodes: z.array(z.object({
    label: z.string(),
    description: z.string().optional(),
    content: z.string().optional(),
    color: z.string().optional(),
    x: z.number().describe('Horizontal position offset from root (0)'),
    y: z.number().describe('Vertical position offset from root (0)'),
    type: z.enum(['root', 'manual', 'ai_generated', 'exported']).default('ai_generated'),
    parentLabel: z.string().optional().describe('Label of the logical parent node to create an edge')
  }))
});

export const ExpandBoardBranchOutputSchema = z.object({
  nodes: z.array(z.object({
    label: z.string(),
    description: z.string().optional(),
    content: z.string().optional(),
    color: z.string().optional(),
    x: z.number().describe('Absolute horizontal position'),
    y: z.number().describe('Absolute vertical position'),
    type: z.enum(['root', 'manual', 'ai_generated', 'exported']).default('ai_generated'),
    parentNodeId: z.string().optional().describe('ID of the node to link this expansion to')
  }))
});

export const SuggestBoardGapsOutputSchema = z.object({
  gaps: z.array(z.object({
    title: z.string().describe('A title for the missing logical gap'),
    missingPerspective: z.string().describe('Reasoning for why this part is missing'),
    recommendedNodeLabel: z.string().describe('Suggested name for a node to fill this gap')
  }))
});

```

### lib/config/github.ts

```typescript
/**
 * lib/config/github.ts
 * Centralized GitHub configuration — reads from env vars, validates presence
 * of required vars (in dev), and exposes typed helpers for repo coordinates.
 */

export interface GitHubConfig {
  token: string
  owner: string
  repo: string
  defaultBranch: string
  webhookSecret: string
  /** Optional: name of the prototype workflow file (e.g. "copilot-prototype.yml") */
  workflowPrototype: string
  /** Optional: name of the fix-request workflow file */
  workflowFixRequest: string
  /** Optional: label prefix applied to GitHub issues created by Mira */
  labelPrefix: string
  /** Optional: public base URL for this deployment (e.g. "https://mira.vercel.app") */
  appBaseUrl: string
}

const REQUIRED_VARS = [
  'GITHUB_TOKEN',
  'GITHUB_OWNER',
  'GITHUB_REPO',
  'GITHUB_WEBHOOK_SECRET',
] as const

/**
 * Returns true if the minimum required GitHub env vars are present.
 * Use this for graceful degradation (local-only mode).
 */
export function isGitHubConfigured(): boolean {
  return REQUIRED_VARS.every((key) => Boolean(process.env[key]))
}

/**
 * Returns the full "owner/repo" string.
 * Throws if GitHub is not configured.
 */
export function getRepoFullName(): string {
  const config = getGitHubConfig()
  return `${config.owner}/${config.repo}`
}

/**
 * Returns just the owner + repo fields as a plain object.
 * Convenient for Octokit calls that take `{ owner, repo }`.
 */
export function getRepoCoordinates(): { owner: string; repo: string } {
  const config = getGitHubConfig()
  return { owner: config.owner, repo: config.repo }
}

/**
 * Returns the full validated GitHub config object.
 * In development, throws with a clear message if required vars are absent.
 * In production (NODE_ENV === 'production'), returns a partial/empty config
 * instead of throwing so the build step can succeed even without secrets.
 */
export function getGitHubConfig(): GitHubConfig {
  const isDev = process.env.NODE_ENV !== 'production'

  if (isDev) {
    const missing = REQUIRED_VARS.filter((key) => !process.env[key])
    if (missing.length > 0) {
      // Only throw when someone actually tries to use GitHub features — not at
      // import time — so the rest of the app still boots without GitHub vars.
      throw new Error(
        `[Mira] Missing required GitHub env vars: ${missing.join(', ')}. ` +
          `Check .env.local and wiring.md for setup instructions.`
      )
    }
  }

  return {
    token: process.env.GITHUB_TOKEN ?? '',
    owner: process.env.GITHUB_OWNER ?? '',
    repo: process.env.GITHUB_REPO ?? '',
    defaultBranch: process.env.GITHUB_DEFAULT_BRANCH ?? 'main',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? '',
    workflowPrototype: process.env.GITHUB_WORKFLOW_PROTOTYPE ?? '',
    workflowFixRequest: process.env.GITHUB_WORKFLOW_FIX_REQUEST ?? '',
    labelPrefix: process.env.GITHUB_LABEL_PREFIX ?? 'mira:',
    appBaseUrl: process.env.APP_BASE_URL ?? '',
  }
}

```

### lib/constants.ts

```typescript
export const MAX_ARENA_PROJECTS = 3
export const STALE_ICEBOX_DAYS = 14

export const PROJECT_STATES = ['arena', 'icebox', 'shipped', 'killed'] as const
export const EXECUTION_PATHS = ['solo', 'assisted', 'delegated'] as const
export const SCOPE_OPTIONS = ['small', 'medium', 'large'] as const

export const DRILL_STEPS = [
  'intent',
  'success_metric',
  'scope',
  'path',
  'priority',
  'decision',
] as const

export type DrillStep = (typeof DRILL_STEPS)[number]

export const STORAGE_DIR = '.local-data'
export const STORAGE_PATH = `${STORAGE_DIR}/studio.json`

// --- Sprint 2: GitHub execution modes ---

export const EXECUTION_MODES = [
  'copilot_issue_assignment',
  'custom_workflow_dispatch',
  'local_agent',
] as const

export type ExecutionMode = (typeof EXECUTION_MODES)[number]

export const AGENT_RUN_KINDS = [
  'prototype',
  'fix_request',
  'spec',
  'research_summary',
  'copilot_issue_assignment',
] as const

export const AGENT_RUN_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'blocked',
] as const

// --- Sprint 3: Dev Auto-Login ---
// Hardcoded user for development — no auth required.
// Matches the seed row in Supabase: users.id = 'a0000000-0000-0000-0000-000000000001'
export const DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000001'

// Seeded template IDs
export const DEFAULT_TEMPLATE_IDS = {
  questionnaire: 'b0000000-0000-0000-0000-000000000001',
  lesson: 'b0000000-0000-0000-0000-000000000002',
  challenge: 'b0000000-0000-0000-0000-000000000003',
  plan_builder: 'b0000000-0000-0000-0000-000000000004',
  reflection: 'b0000000-0000-0000-0000-000000000005',
  essay_tasks: 'b0000000-0000-0000-0000-000000000006',
} as const

// --- Sprint 3: Experience Engine ---

export const EXPERIENCE_CLASSES = [
  'questionnaire',
  'lesson',
  'challenge',
  'plan_builder',
  'reflection',
  'essay_tasks',
  'checkpoint',
] as const

export type ExperienceClass = (typeof EXPERIENCE_CLASSES)[number]

export const EXPERIENCE_STATUSES = [
  'proposed',
  'drafted',
  'ready_for_review',
  'approved',
  'published',
  'active',
  'completed',
  'archived',
  'superseded',
  'injected',
] as const

export type ExperienceStatus = (typeof EXPERIENCE_STATUSES)[number]

export const EPHEMERAL_STATUSES = ['injected', 'active', 'completed', 'archived'] as const

export const RESOLUTION_DEPTHS = ['light', 'medium', 'heavy'] as const
export const RESOLUTION_MODES = ['illuminate', 'practice', 'challenge', 'build', 'reflect', 'study'] as const
export const RESOLUTION_TIME_SCOPES = ['immediate', 'session', 'multi_day', 'ongoing'] as const
export const RESOLUTION_INTENSITIES = ['low', 'medium', 'high'] as const

export type ResolutionDepth = (typeof RESOLUTION_DEPTHS)[number]
export type ResolutionMode = (typeof RESOLUTION_MODES)[number]
export type ResolutionTimeScope = (typeof RESOLUTION_TIME_SCOPES)[number]
export type ResolutionIntensity = (typeof RESOLUTION_INTENSITIES)[number]

// --- Sprint 8: Knowledge Tab ---

export const KNOWLEDGE_UNIT_TYPES = ['foundation', 'playbook', 'deep_dive', 'example', 'audio_script', 'misconception'] as const
export type KnowledgeUnitType = (typeof KNOWLEDGE_UNIT_TYPES)[number]

export const MASTERY_STATUSES = ['unseen', 'read', 'practiced', 'confident'] as const
export type MasteryStatus = (typeof MASTERY_STATUSES)[number]

// --- Sprint 9: Content Density ---

export const CONTENT_BUILDER_TYPES = ['foundation', 'playbook', 'deep_dive', 'example', 'audio_script', 'misconception'] as const
export type ContentBuilderType = (typeof CONTENT_BUILDER_TYPES)[number]

// --- Sprint 10: Curriculum Engine ---

export const CURRICULUM_STATUSES = ['planning', 'active', 'completed', 'archived'] as const
export type CurriculumStatus = (typeof CURRICULUM_STATUSES)[number]

export const STEP_KNOWLEDGE_LINK_TYPES = ['teaches', 'tests', 'deepens', 'pre_support', 'enrichment'] as const
export type StepKnowledgeLinkType = (typeof STEP_KNOWLEDGE_LINK_TYPES)[number]

export const CHECKPOINT_ON_FAIL = ['retry', 'continue', 'tutor_redirect'] as const
export type CheckpointOnFail = (typeof CHECKPOINT_ON_FAIL)[number]

// --- Sprint 13: Goal OS ---

export const GOAL_STATUSES = ['intake', 'active', 'paused', 'completed', 'archived'] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]

export const SKILL_MASTERY_LEVELS = ['undiscovered', 'aware', 'beginner', 'practicing', 'proficient', 'expert'] as const
export type SkillMasteryLevel = (typeof SKILL_MASTERY_LEVELS)[number]

export const MASTERY_THRESHOLDS: Record<SkillMasteryLevel, number> = {
  undiscovered: 0,
  aware: 1,
  beginner: 2,
  practicing: 5,
  proficient: 10,
  expert: 20,
}

// --- Sprint 21: Enrichment Loop ---

export const ENRICHMENT_REQUEST_STATUSES = [
  'pending',
  'dispatched',
  'delivered',
  'failed',
  'cancelled',
] as const

export type EnrichmentRequestStatus = (typeof ENRICHMENT_REQUEST_STATUSES)[number]

export const ENRICHMENT_DELIVERY_STATUSES = [
  'received',
  'processed',
  'rejected',
  'failed',
] as const

export type EnrichmentDeliveryStatus = (typeof ENRICHMENT_DELIVERY_STATUSES)[number]


```

### lib/contracts/experience-contract.ts

```typescript
/**
 * v1 Experience Instance Contract
 * ================================
 * All fields here are CONTRACTED — validators and renderers may depend on them.
 * Adding a field = non-breaking. Removing/renaming = breaking (requires version bump).
 *
 * Field Stability Levels:
 * - @stable   — will not change within this contract version
 * - @evolving — may gain new valid values (e.g., new instance_type options)
 * - @computed — system-written, read-only to creators (GPT/API may not set these)
 *
 * @version 1
 */

import type { ResolutionContractV1, ReentryContractV1 } from './resolution-contract'

// ---------------------------------------------------------------------------
// Contract version
// ---------------------------------------------------------------------------

/** Current contract version. Validators/renderers target this version. */
export const EXPERIENCE_CONTRACT_VERSION = 1

// ---------------------------------------------------------------------------
// Payload versioning
// ---------------------------------------------------------------------------

/**
 * PAYLOAD VERSIONING STRATEGY (v1):
 *
 * Step payloads MAY carry an optional `v` field at the top level.
 * - If `v` is absent → treat as v1.
 * - If `v` matches EXPERIENCE_CONTRACT_VERSION → validate normally.
 * - If `v` > EXPERIENCE_CONTRACT_VERSION → pass-through with warning (don't reject).
 * - If `v` < 1 → reject as invalid.
 *
 * Rules:
 * - New fields are additive-only within the same version.
 * - Removing or renaming a contracted field = version bump.
 * - v1 does NOT wrap payloads in an envelope (existing data has no `v` field).
 *   The `v` field is a top-level optional field on the payload itself.
 */
export const PAYLOAD_VERSION_FIELD = 'v' as const
export const SUPPORTED_PAYLOAD_VERSION = 1

/** Envelope for future use. v1 does NOT require wrapping — `v` is a flat top-level field. */
export interface StepPayloadEnvelope<T = unknown> {
  /** Payload version. Defaults to 1 if absent. */
  v?: number
  /** The typed payload data. */
  data: T
}

// ---------------------------------------------------------------------------
// Experience statuses (contracted subset — aligned with state machine)
// ---------------------------------------------------------------------------

/** @stable */
export type ExperienceStatusContracted =
  | 'proposed'
  | 'drafted'
  | 'ready_for_review'
  | 'approved'
  | 'published'
  | 'active'
  | 'completed'
  | 'archived'
  | 'superseded'
  | 'injected'

// ---------------------------------------------------------------------------
// v1 Experience Instance Contract
// ---------------------------------------------------------------------------

export interface ExperienceInstanceContractV1 {
  // ── Identity ── @stable
  id: string
  user_id: string
  template_id: string

  // ── Content ── @stable
  /** Max 200 characters. */
  title: string
  /** Max 1000 characters. */
  goal: string

  // ── Classification ── @evolving (may gain new instance_type values)
  instance_type: 'persistent' | 'ephemeral'
  status: ExperienceStatusContracted

  // ── Behavior ── @stable structure, @evolving enum values
  resolution: ResolutionContractV1
  reentry: ReentryContractV1 | null

  // ── Graph ── @stable
  previous_experience_id: string | null
  next_suggested_ids: string[]

  // ── Metadata ── @stable
  /** Who created this instance. @evolving — may gain new generator values. */
  generated_by: string | null   // 'gpt' | 'dev-harness' | 'api' | 'coder'
  source_conversation_id: string | null
  /** ISO 8601. */
  created_at: string
  /** ISO 8601. Set on publish transition. */
  published_at: string | null

  // ── Computed ── @computed (system-written, read-only to creators)
  /** Computed by progression engine. Never set by GPT/API directly. */
  friction_level: 'low' | 'medium' | 'high' | null
}

/** Contracted fields a creator (GPT/API) may set when creating an instance. */
export type CreatableInstanceFields = Omit<
  ExperienceInstanceContractV1,
  'id' | 'created_at' | 'published_at' | 'friction_level' | 'status'
>

// ---------------------------------------------------------------------------
// Module Roles — capability-oriented, not product-taxonomy
// ---------------------------------------------------------------------------

/**
 * MODULE ROLES describe what a module DOES, not what it IS.
 * The same step_type can serve different roles in different experiences.
 *
 * This mapping keeps graph/timeline/profile generic:
 * - A "questionnaire" step has role "capture" — it captures user input.
 * - A "lesson" step has role "deliver" — it delivers content.
 * - A "challenge" step has role "activate" — it activates the user.
 *
 * @stable — roles may be added but not renamed or removed.
 */
export type ModuleRole = 'capture' | 'deliver' | 'activate' | 'synthesize' | 'plan' | 'produce'

/** Maps contracted step types to their capability role. */
export const STEP_TYPE_ROLES: Record<string, ModuleRole> = {
  questionnaire: 'capture',
  lesson: 'deliver',
  challenge: 'activate',
  reflection: 'synthesize',
  plan_builder: 'plan',
  essay_tasks: 'produce',
}

/**
 * Human-readable labels for capability roles.
 * Used by graph/timeline/profile for generic labeling that won't break
 * when step types are renamed or new types are added.
 */
export const MODULE_ROLE_LABELS: Record<ModuleRole, string> = {
  capture: 'Input captured',
  deliver: 'Content delivered',
  activate: 'Challenge completed',
  synthesize: 'Reflection recorded',
  plan: 'Plan built',
  produce: 'Artifact produced',
}

/**
 * Resolve the capability role for a step type.
 * Returns undefined for unregistered types (unknown steps).
 */
export function getModuleRole(stepType: string): ModuleRole | undefined {
  return STEP_TYPE_ROLES[stepType]
}

```

### lib/contracts/resolution-contract.ts

```typescript
/**
 * v1 Resolution + Re-entry Contract
 * ===================================
 * Resolution controls renderer chrome, coder spec shape, and GPT entry behavior.
 * Re-entry controls how GPT re-enters a user's context after an experience event.
 *
 * @version 1
 */

// ---------------------------------------------------------------------------
// Resolution contract
// ---------------------------------------------------------------------------

/** @stable — values may be added but not removed */
export type ResolutionDepthV1 = 'light' | 'medium' | 'heavy'

/** @evolving — new modes may be added */
export type ResolutionModeV1 = 'illuminate' | 'practice' | 'challenge' | 'build' | 'reflect' | 'study'

/** @evolving — new scopes may be added */
export type ResolutionTimeScopeV1 = 'immediate' | 'session' | 'multi_day' | 'ongoing'

/** @stable */
export type ResolutionIntensityV1 = 'low' | 'medium' | 'high'

/** All 4 fields are required. @stable structure, @evolving enum values. */
export interface ResolutionContractV1 {
  depth: ResolutionDepthV1
  mode: ResolutionModeV1
  timeScope: ResolutionTimeScopeV1
  intensity: ResolutionIntensityV1
}

// ---------------------------------------------------------------------------
// Resolution → Chrome mapping (contracted renderer behavior)
// ---------------------------------------------------------------------------

export interface ResolutionChromeConfig {
  /** Show full header with title/goal. */
  showHeader: boolean
  /** Show step progress bar. */
  showProgress: boolean
  /** Show goal text in header. */
  showGoal: boolean
}

/**
 * Maps resolution depth to renderer chrome configuration.
 * This is the contracted mapping — renderers MUST use this, not hand-wire chrome.
 *
 * - `light`  → immersive, no chrome (clean step only)
 * - `medium` → progress bar + step title
 * - `heavy`  → full header with goal, progress, description
 *
 * @stable
 */
export const RESOLUTION_CHROME_MAP: Record<ResolutionDepthV1, ResolutionChromeConfig> = {
  light:  { showHeader: false, showProgress: false, showGoal: false },
  medium: { showHeader: false, showProgress: true,  showGoal: false },
  heavy:  { showHeader: true,  showProgress: true,  showGoal: true  },
}

/**
 * Look up chrome config for a depth value.
 * Falls back to 'medium' for unknown values (defensive).
 */
export function getChromeForDepth(depth: ResolutionDepthV1): ResolutionChromeConfig {
  return RESOLUTION_CHROME_MAP[depth] ?? RESOLUTION_CHROME_MAP.medium
}

// ---------------------------------------------------------------------------
// Valid enum values (for validators)
// ---------------------------------------------------------------------------

export const VALID_DEPTHS: readonly ResolutionDepthV1[] = ['light', 'medium', 'heavy']
export const VALID_MODES: readonly ResolutionModeV1[] = ['illuminate', 'practice', 'challenge', 'build', 'reflect', 'study']
export const VALID_TIME_SCOPES: readonly ResolutionTimeScopeV1[] = ['immediate', 'session', 'multi_day', 'ongoing']
export const VALID_INTENSITIES: readonly ResolutionIntensityV1[] = ['low', 'medium', 'high']

// ---------------------------------------------------------------------------
// Re-entry contract
// ---------------------------------------------------------------------------

/** @evolving — new trigger types may be added */
export type ReentryTriggerV1 = 'time' | 'completion' | 'inactivity' | 'manual'

/** @evolving — new context scopes may be added */
export type ReentryContextScopeV1 = 'minimal' | 'full' | 'focused'

/**
 * Re-entry contract: defines how GPT re-enters after an experience event.
 *
 * - `trigger` — when to fire (completion, inactivity, time-based, manual)
 * - `prompt` — what GPT says on re-entry (max 500 chars)
 * - `contextScope` — how much history GPT should load
 *
 * @stable structure, @evolving enum values
 */
export interface ReentryContractV1 {
  trigger: ReentryTriggerV1
  /** Max 500 characters. The GPT message on re-entry. */
  prompt: string
  contextScope: ReentryContextScopeV1
}

// ---------------------------------------------------------------------------
// Validation helpers (for use by Lane 4 validators)
// ---------------------------------------------------------------------------

export const VALID_TRIGGERS: readonly ReentryTriggerV1[] = ['time', 'completion', 'inactivity', 'manual']
export const VALID_CONTEXT_SCOPES: readonly ReentryContextScopeV1[] = ['minimal', 'full', 'focused']

```

### lib/contracts/step-contracts.ts

```typescript
/**
 * v1 Step Payload Contracts
 * =========================
 * Per-type payload contracts define ONLY the fields that validators and renderers
 * may depend on. Renderers MUST NOT read fields outside these contracts.
 * Validators MUST NOT reject payloads for having extra fields.
 *
 * @version 1
 */

import { ExperienceBlock } from '@/types/experience';

// ---------------------------------------------------------------------------
// Base step contract (shared by all step types)
// ---------------------------------------------------------------------------

/** @stable — all steps have these fields */
export interface StepContractBase {
  id: string
  instance_id: string
  step_order: number
  /** Registered step type key. See CONTRACTED_STEP_TYPES for known types. */
  step_type: string
  title: string
  /** Typed per step_type — see individual payload contracts below. */
  payload: unknown
  completion_rule: string | null
  /** @evolving — v1.1 status and scheduling */
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  /** @evolving — v1.1 scheduling: ISO 8601 date (YYYY-MM-DD) */
  scheduled_date?: string | null;
  /** @evolving — v1.1 scheduling: ISO 8601 date (YYYY-MM-DD) */
  due_date?: string | null;
  /** @evolving — v1.1 scheduling */
  estimated_minutes?: number | null;
  /** @evolving — v1.1 completion timestamp */
  completed_at?: string | null;
}

// ---------------------------------------------------------------------------
// Contracted step types
// ---------------------------------------------------------------------------

/**
 * Step types with formal payload contracts.
 * Validators MUST validate payloads for these types.
 * Unknown types outside this list pass validation (see UNKNOWN_STEP_POLICY).
 *
 * @stable — types may be added but not removed.
 */
export const CONTRACTED_STEP_TYPES = [
  'questionnaire',
  'lesson',
  'challenge',
  'reflection',
  'plan_builder',
  'essay_tasks',
  'checkpoint',
] as const

export type ContractedStepType = (typeof CONTRACTED_STEP_TYPES)[number]

/** Type guard: is this step type contracted? */
export function isContractedStepType(type: string): type is ContractedStepType {
  return (CONTRACTED_STEP_TYPES as readonly string[]).includes(type)
}

// ---------------------------------------------------------------------------
// Per-type payload contracts
// ---------------------------------------------------------------------------

// ── Questionnaire ──

export interface QuestionnaireQuestion {
  id: string
  /** The display text of the question. Renderers use `label`, not `text`. */
  label: string
  type: 'text' | 'choice' | 'scale'
  /** Required when type = 'choice'. Optional scale anchor labels for type = 'scale'. */
  options?: string[]
}

/** @stable */
export interface QuestionnairePayloadV1 {
  v?: number
  questions: QuestionnaireQuestion[]
}

// ── Lesson ──

export interface LessonSection {
  heading?: string
  body: string
  /** @evolving — may gain new section types (e.g., 'video', 'quiz') */
  type?: 'text' | 'callout' | 'checkpoint'
}

/** @stable */
export interface LessonPayloadV1 {
  v?: number
  sections: LessonSection[]
  blocks?: ExperienceBlock[]
}

// ── Challenge ──

export interface ChallengeObjective {
  id: string
  description: string
  /** When true, the user must provide proof text to mark complete. */
  proof_required?: boolean
}

/** @stable */
export interface ChallengePayloadV1 {
  v?: number
  objectives: ChallengeObjective[]
  blocks?: ExperienceBlock[]
}

// ── Reflection ──

export interface ReflectionPrompt {
  id: string
  text: string
  /** @evolving — may gain new format types */
  format?: 'free_text' | 'rating'
}

/** @stable */
export interface ReflectionPayloadV1 {
  v?: number
  prompts: ReflectionPrompt[]
  blocks?: ExperienceBlock[]
}

// ── Plan Builder ──

export interface PlanBuilderItem {
  id: string
  text: string
  done?: boolean
}

export interface PlanBuilderSection {
  type: 'goals' | 'milestones' | 'resources'
  title?: string
  items: PlanBuilderItem[]
}

/** @stable */
export interface PlanBuilderPayloadV1 {
  v?: number
  sections: PlanBuilderSection[]
  blocks?: ExperienceBlock[]
}

// ── Essay + Tasks ──

export interface EssayTask {
  id: string
  description: string
  done?: boolean
}

/** @stable */
export interface EssayTasksPayloadV1 {
  v?: number
  /** The essay/reading content. */
  content: string
  tasks: EssayTask[]
  blocks?: ExperienceBlock[]
}

// ── Checkpoint ──

export interface CheckpointQuestion {
  id: string
  question: string
  expected_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  format: 'free_text' | 'choice'
  options?: string[]
}

/** @stable */
export interface CheckpointPayloadV1 {
  v?: number
  knowledge_unit_id: string
  questions: CheckpointQuestion[]
  passing_threshold: number
  on_fail: 'retry' | 'continue' | 'tutor_redirect'
  blocks?: ExperienceBlock[]
}

// ---------------------------------------------------------------------------
// Discriminated union (for typed dispatch)
// ---------------------------------------------------------------------------

/**
 * Union of all contracted v1 step payloads.
 * Use with `step_type` as the discriminator for type narrowing.
 */
export type StepPayloadV1 =
  | QuestionnairePayloadV1
  | LessonPayloadV1
  | ChallengePayloadV1
  | ReflectionPayloadV1
  | PlanBuilderPayloadV1
  | EssayTasksPayloadV1
  | CheckpointPayloadV1

/**
 * Maps contracted step type string to its payload type.
 * Usage: `StepPayloadMap['questionnaire']` → `QuestionnairePayloadV1`
 */
export interface StepPayloadMap {
  questionnaire: QuestionnairePayloadV1
  lesson: LessonPayloadV1
  challenge: ChallengePayloadV1
  reflection: ReflectionPayloadV1
  plan_builder: PlanBuilderPayloadV1
  essay_tasks: EssayTasksPayloadV1
  checkpoint: CheckpointPayloadV1
}

// ---------------------------------------------------------------------------
// Unknown step fallback policy
// ---------------------------------------------------------------------------

/**
 * UNKNOWN STEP POLICY (v1):
 *
 * - Validators: PASS unknown step types (don't reject — future step types
 *   should not fail validation). Log a warning.
 *
 * - Renderers: Fall back to FallbackStep component (already exists in
 *   renderer-registry.tsx). FallbackStep renders step_type + raw payload
 *   as formatted JSON.
 *
 * - GPT: May create steps with unregistered types. The system accepts them
 *   gracefully. The contract doesn't enumerate all possible types — it
 *   enumerates CONTRACTED types.
 *
 * This ensures forward compatibility: a v2 GPT can emit step types that v1
 * renderers don't understand, and the system degrades gracefully instead of
 * crashing.
 *
 * @stable
 */
export const UNKNOWN_STEP_POLICY = 'pass-through-with-fallback' as const

```

### lib/date.ts

```typescript
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function daysSince(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

```

### lib/enrichment/atom-mapper.ts

```typescript
// lib/enrichment/atom-mapper.ts
import { NexusAtomPayload } from '@/types/enrichment';
import { createKnowledgeUnit } from '@/lib/services/knowledge-service';
import { linkStepToKnowledge } from '@/lib/services/step-knowledge-link-service';

export interface MapperContext {
  userId: string;
  targetExperienceId?: string;
  targetStepId?: string;
  requestId?: string;
  domain?: string;
  topic?: string;
}

export interface MappedEntity {
  entityType: 'knowledge_unit' | 'step_attachment';
  entityId: string;
  summary: string;
}

/**
 * mapAtomToMiraEntity
 * Translates a Nexus learning atom into a Mira runtime object (KnowledgeUnit).
 */
export async function mapAtomToMiraEntity(
  atom: NexusAtomPayload,
  context: MapperContext
): Promise<MappedEntity | null> {
  const { userId, targetExperienceId, targetStepId, domain, topic } = context;
  const atomType = atom.atom_type;

  console.log(`[atom-mapper] Mapping atom type: ${atomType} for user: ${userId}`);

  try {
    if (atomType === 'concept_explanation') {
      // 1. Create Knowledge Unit (Foundation)
      const unit = await createKnowledgeUnit({
        user_id: userId,
        topic: topic || 'nexus-enrichment',
        domain: domain || 'nexus-enrichment',
        unit_type: 'foundation',
        title: atom.title,
        thesis: atom.thesis,
        content: atom.content,
        key_ideas: atom.key_ideas || [],
        citations: atom.citations || [],
        mastery_status: 'unseen',
        linked_experience_ids: targetExperienceId ? [targetExperienceId] : [],
        source_experience_id: targetExperienceId || null,
      });

      // 2. Link to step if provided
      if (targetStepId) {
        await linkStepToKnowledge(targetStepId, unit.id, 'enrichment');
      }

      return {
        entityType: 'knowledge_unit',
        entityId: unit.id,
        summary: `Created foundation unit: ${unit.title}`,
      };
    } 
    
    if (atomType === 'misconception_correction') {
      // 1. Create Knowledge Unit (Misconception)
      const unit = await createKnowledgeUnit({
        user_id: userId,
        topic: topic || 'nexus-enrichment',
        domain: domain || 'nexus-enrichment',
        unit_type: 'misconception',
        title: atom.title,
        thesis: atom.thesis || `Correction for: ${atom.misconception}`,
        content: atom.correction || atom.content, // Favor correction field, fallback to content
        common_mistake: atom.misconception || null,
        key_ideas: atom.key_ideas || [],
        citations: atom.citations || [],
        mastery_status: 'unseen',
        linked_experience_ids: targetExperienceId ? [targetExperienceId] : [],
        source_experience_id: targetExperienceId || null,
      });

      // 2. Link to step if provided
      if (targetStepId) {
        await linkStepToKnowledge(targetStepId, unit.id, 'enrichment');
      }

      return {
        entityType: 'knowledge_unit',
        entityId: unit.id,
        summary: `Created misconception unit: ${unit.title}`,
      };
    }

    // Logic for other types can be added here in the future
    console.warn(`[atom-mapper] Unknown or unhandled atom type: ${atomType}`);
    return null;
  } catch (error) {
    console.error(`[atom-mapper] Failed to map atom ${atomType}:`, error);
    throw error;
  }
}

```

### lib/enrichment/interaction-events.ts

```typescript
/**
 * Interaction Event Types for the Mira Experience Engine.
 * These are the canonical event names used for telemetry.
 */
export const INTERACTION_EVENTS = {
  STEP_VIEWED: 'step_viewed',
  ANSWER_SUBMITTED: 'answer_submitted',
  TASK_COMPLETED: 'task_completed',
  STEP_SKIPPED: 'step_skipped',
  TIME_ON_STEP: 'time_on_step',
  EXPERIENCE_STARTED: 'experience_started',
  EXPERIENCE_COMPLETED: 'experience_completed',
  DRAFT_SAVED: 'draft_saved',
  CHECKPOINT_GRADED: 'checkpoint_graded',
  CHECKPOINT_GRADED_BATCH: 'checkpoint_graded_batch',
  
  // Lane 6: Granular Block Telemetry
  BLOCK_HINT_USED: 'block_hint_used',
  BLOCK_PREDICTION_SUBMITTED: 'block_prediction_submitted',
  BLOCK_EXERCISE_COMPLETED: 'block_exercise_completed',

  // Lane 4: Proactive Coach Telemetry
  COACH_TRIGGER_CHECKPOINT_FAIL: 'coach_trigger_checkpoint_fail',
  COACH_TRIGGER_DWELL: 'coach_trigger_dwell',
  COACH_TRIGGER_UNREAD_KNOWLEDGE: 'coach_trigger_unread_knowledge',
} as const;

export type InteractionEventType = (typeof INTERACTION_EVENTS)[keyof typeof INTERACTION_EVENTS];

/**
 * Utility to build a typed interaction payload.
 * This ensures consistency across different capture points.
 */
export function buildInteractionPayload(
  eventType: InteractionEventType,
  instanceId: string,
  stepId?: string,
  extra: Record<string, any> = {}
) {
  return {
    instanceId,
    stepId,
    eventType,
    eventPayload: extra,
  };
}

```

### lib/enrichment/nexus-bridge.ts

```typescript
// lib/enrichment/nexus-bridge.ts
import { NexusIngestPayload, NexusAtomPayload, NexusAtomType } from '@/types/enrichment';
import { 
  getDeliveryByIdempotencyKey, 
  createEnrichmentDelivery, 
  updateEnrichmentRequestStatus 
} from '@/lib/services/enrichment-service';
import { mapAtomToMiraEntity, MapperContext } from './atom-mapper';
import { createInboxEvent } from '@/lib/services/inbox-service';

export interface ProcessedDelivery {
  deliveryId: string;
  status: 'processed' | 'already_delivered' | 'failed';
  processedCount: number;
  atoms: Array<{ delivery_id: string; atom_type: string; status: string }>;
}

/**
 * processNexusDelivery
 * Orchestrates the translation and storage of Nexus atoms.
 * Handles idempotency per-atom, record creation, mapping and timeline notification.
 */
export async function processNexusDelivery(
  payload: NexusIngestPayload,
  userId: string
): Promise<ProcessedDelivery> {
  const { delivery_id, request_id, atoms, target_experience_id, target_step_id } = payload;
  const baseKey = delivery_id;

  console.log(`[nexus-bridge] Processing delivery ${baseKey} for user ${userId}`);

  // 1. Double-check idempotency (the route should have checked this but we check per-atom too)
  const existingDelivery = await getDeliveryByIdempotencyKey(baseKey);
  const existingAtom0 = await getDeliveryByIdempotencyKey(`${baseKey}:0`);
  
  if (existingDelivery || existingAtom0) {
    console.log(`[nexus-bridge] Delivery batch ${baseKey} (or atom 0) already processed.`);
    return {
      deliveryId: baseKey,
      status: 'already_delivered',
      processedCount: 0,
      atoms: [],
    };
  }

  const processedAtoms: Array<{ delivery_id: string; atom_type: string; status: string }> = [];
  let mappedCount = 0;

  // 2. Map each atom
  for (let i = 0; i < atoms.length; i++) {
    const atom = atoms[i];
    const atomKey = atoms.length === 1 ? baseKey : `${baseKey}:${i}`;

    try {
      // Small check to see if THIS atom was already delivered (e.g. partial batch retry)
      const existingAtom = await getDeliveryByIdempotencyKey(atomKey);
      if (existingAtom) {
        processedAtoms.push({ 
          delivery_id: atomKey, 
          atom_type: atom.atom_type, 
          status: existingAtom.status 
        });
        continue;
      }

      // Create a delivery record for tracking
      const deliveryRecord = await createEnrichmentDelivery({
        requestId: request_id || null,
        idempotencyKey: atomKey,
        sourceService: 'nexus',
        atomType: atom.atom_type,
        atomPayload: atom,
        targetExperienceId: target_experience_id || null,
        targetStepId: target_step_id || null,
        status: 'received',
      });

      // Execute mapping
      const context: MapperContext = {
        userId,
        targetExperienceId: target_experience_id,
        targetStepId: target_step_id,
        requestId: request_id,
        domain: 'nexus-enrichment',
      };

      const result = await mapAtomToMiraEntity(atom, context);

      if (result) {
        mappedCount++;
        // Update delivery record with mapped entity
        const { updateDeliveryStatus } = await import('@/lib/services/enrichment-service');
        await updateDeliveryStatus(
          deliveryRecord.id, 
          'processed', 
          result.entityType, 
          result.entityId
        );

        processedAtoms.push({ 
          delivery_id: atomKey, 
          atom_type: atom.atom_type, 
          status: 'processed' 
        });
      } else {
        // Unknown or unhandled atom type
        const { updateDeliveryStatus } = await import('@/lib/services/enrichment-service');
        await updateDeliveryStatus(deliveryRecord.id, 'rejected');
        processedAtoms.push({ 
          delivery_id: atomKey, 
          atom_type: atom.atom_type, 
          status: 'rejected' 
        });
      }
    } catch (error) {
      console.error(`[nexus-bridge] Failed to process atom ${atom.atom_type}:`, error);
      processedAtoms.push({ 
        delivery_id: atomKey, 
        atom_type: atom.atom_type, 
        status: 'failed' 
      });
    }
  }

  // 3. If request_id provided (usually on full delivery) -> update enrichment_request status to 'delivered'
  if (request_id && mappedCount > 0) {
    await updateEnrichmentRequestStatus(request_id, 'delivered');
  }

  // 1. Create timeline event
  if (mappedCount > 0) {
    await createInboxEvent({
      type: 'knowledge_ready',
      title: 'Enrichment Delivered',
      body: `Nexus enrichment delivered: ${mappedCount} learning atom${mappedCount > 1 ? 's' : ''} integrated.`,
      severity: 'success',
      projectId: target_experience_id || undefined,
      actionUrl: target_experience_id ? `/workspace/${target_experience_id}` : '/library',
    });
  }

  return {
    deliveryId: baseKey,
    status: 'processed',
    processedCount: mappedCount,
    atoms: processedAtoms,
  };
}

```

### lib/experience/CAPTURE_CONTRACT.md

```markdown
# Mira Interaction Capture — Contract

> Documentation for the telemetry layer of the Mira Experience Engine.

This document defines the interface and behaviors for tracking user interactions within an Experience. It is used by the `useInteractionCapture` hook and implemented by the `/api/interactions` endpoint.

---

## API Endpoint

**`POST /api/interactions`**

### Request Body Schema
```json
{
  "instanceId": "string (UUID)",
  "stepId": "string (UUID) | optional",
  "eventType": "InteractionEventType",
  "eventPayload": "object (JSONB) | optional"
}
```

---

## Event Types & Payloads

### 1. `step_viewed`
- **Trigger**: Fired when a user enters/views a specific step in an experience.
- **`stepId`**: Required.
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_1",
    "eventType": "step_viewed"
  }
  ```

### 2. `answer_submitted`
- **Trigger**: Fired when a user submits data for a specific step (e.g., questionnaire responses).
- **`stepId`**: Required.
- **Payload**: `{ answers: Record<string, any> }`
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_1",
    "eventType": "answer_submitted",
    "eventPayload": {
      "answers": { "q1": "val1", "q2": "val2" }
    }
  }
  ```

### 3. `task_completed`
- **Trigger**: Fired when a specific task or objective within a step is marked as complete.
- **`stepId`**: Required.
- **Payload**: Optional metadata about completion.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_2",
    "eventType": "task_completed"
  }
  ```

### 4. `step_skipped`
- **Trigger**: Fired when a user chooses to skip an optional step.
- **`stepId`**: Required.
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_3",
    "eventType": "step_skipped"
  }
  ```

### 5. `time_on_step`
- **Trigger**: Fired when a user leaves a step (navigates away or finishes). Measures active dwell time.
- **`stepId`**: Required.
- **Payload**: `{ durationMs: number }`
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_1",
    "eventType": "time_on_step",
    "eventPayload": { "durationMs": 45000 }
  }
  ```

### 6. `experience_started`
- **Trigger**: Fired once when the experience is first loaded in the workspace.
- **`stepId`**: Optional (usually null).
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "eventType": "experience_started"
  }
  ```

### 7. `experience_completed`
- **Trigger**: Fired when the user reaches the final "complete" state of the entire experience.
- **`stepId`**: Optional (usually null).
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "eventType": "experience_completed"
  }
  ```

---

## Usage in Renderers (Lane 6 Integration)

Renderers should use the `useInteractionCapture` hook:

1.  **Initialize**: `const telemetry = useInteractionCapture(instanceId)`
2.  **Mount**: `useEffect(() => telemetry.trackExperienceStart(), [])`
3.  **Step Entry**: `useEffect(() => { telemetry.trackStepView(currentStepId); telemetry.startStepTimer(currentStepId); return () => telemetry.endStepTimer(currentStepId); }, [currentStepId])`
4.  **Submission**: Pass `telemetry.trackAnswer`, `telemetry.trackComplete`, and `telemetry.trackSkip` down to individual step components.
5.  **Finalize**: Call `telemetry.trackExperienceComplete()` when the experience orchestrator reaches the end state.

```

### lib/experience/interaction-events.ts

```typescript
/**
 * Interaction Event Types for the Mira Experience Engine.
 * These are the canonical event names used for telemetry.
 */
export const INTERACTION_EVENTS = {
  STEP_VIEWED: 'step_viewed',
  ANSWER_SUBMITTED: 'answer_submitted',
  TASK_COMPLETED: 'task_completed',
  STEP_SKIPPED: 'step_skipped',
  TIME_ON_STEP: 'time_on_step',
  EXPERIENCE_STARTED: 'experience_started',
  EXPERIENCE_COMPLETED: 'experience_completed',
  DRAFT_SAVED: 'draft_saved',
  CHECKPOINT_GRADED: 'checkpoint_graded',
  CHECKPOINT_GRADED_BATCH: 'checkpoint_graded_batch',
} as const;

export type InteractionEventType = (typeof INTERACTION_EVENTS)[keyof typeof INTERACTION_EVENTS];

/**
 * Utility to build a typed interaction payload.
 * This ensures consistency across different capture points.
 */
export function buildInteractionPayload(
  eventType: InteractionEventType,
  instanceId: string,
  stepId?: string,
  extra: Record<string, any> = {}
) {
  return {
    instanceId,
    stepId,
    eventType,
    eventPayload: extra,
  };
}

```

### lib/experience/progression-engine.ts

```typescript
import { ExperienceStep } from '@/types/experience';
import { InteractionEvent } from '@/types/interaction';
import { getInteractionsByInstance } from '@/lib/services/interaction-service';
import { updateExperienceInstance, getExperienceSteps } from '@/lib/services/experience-service';

/**
 * Progression Engine
 * Computes scores and friction for experiences based on interaction telemetry.
 */

export function computeStepScore(step: ExperienceStep, interactions: InteractionEvent[]): number {
  const stepInteractions = interactions.filter(i => i.step_id === step.id);
  
  switch (step.step_type) {
    case 'questionnaire': {
      const questions = (step.payload as any)?.questions || [];
      if (questions.length === 0) return 100;
      const answers = stepInteractions.filter(i => i.event_type === 'answer_submitted');
      // Questionnaire emits { answers: { questionId: value, ... } } as event_payload.
      // We need to unwrap the answers field to count individual question IDs.
      const answeredIds = new Set<string>();
      answers.forEach(a => {
        if (a.event_payload) {
          const innerAnswers = a.event_payload.answers || a.event_payload;
          Object.keys(innerAnswers).forEach(key => answeredIds.add(key));
        }
      });
      const percent = (answeredIds.size / questions.length) * 100;
      return Math.min(percent, 100);
    }
    case 'lesson': {

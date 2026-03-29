'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { KnowledgeUnit } from '@/types/knowledge';
import { StepKnowledgeLink } from '@/types/curriculum';
import { COPY } from '@/lib/studio-copy';

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface KnowledgeCompanionProps {
  domain?: string;
  knowledgeUnitId?: string;
  /** stepId is required when mode === 'tutor' so the coach API has context */
  stepId?: string;
  /** Explicitly linked units (Lane 5) */
  initialLinks?: StepKnowledgeLink[];
  /** Controls whether the companion shows read-only content or an interactive tutor chat */
  mode?: 'read' | 'tutor';
  forceExpanded?: boolean;
}

export function KnowledgeCompanion({
  domain,
  knowledgeUnitId,
  stepId,
  initialLinks = [],
  mode = 'read',
  forceExpanded,
}: KnowledgeCompanionProps) {
  const [units, setUnits] = useState<KnowledgeUnit[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    if (forceExpanded) {
      setIsExpanded(true);
    }
  }, [forceExpanded]);

  const [loading, setLoading] = useState(false);

  // TutorChat state
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [masterySignal, setMasterySignal] = useState<'struggling' | 'progressing' | 'confident' | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExpanded) return;

    async function fetchKnowledge() {
      setLoading(true);
      try {
        // Lane 5: Prioritize initialLinks
        if (initialLinks && initialLinks.length > 0) {
          const fetchedUnits: KnowledgeUnit[] = [];
          for (const link of initialLinks) {
            try {
              const res = await fetch(`/api/knowledge/${link.knowledgeUnitId}`);
              if (res.ok) {
                const data = await res.json();
                fetchedUnits.push(data);
              }
            } catch (e) {
              console.error(`Failed to fetch linked unit ${link.knowledgeUnitId}:`, e);
            }
          }
          if (fetchedUnits.length > 0) {
            setUnits(fetchedUnits);
            setLoading(false);
            return;
          }
        }

        // Fallback: Domain-based fetching
        if (domain) {
          const res = await fetch(`/api/knowledge?domain=${encodeURIComponent(domain)}`);
          if (res.ok) {
            const data = await res.json();
            // Grouped response: extract domain units
            if (data.units && typeof data.units === 'object') {
              const domainUnits = data.units[domain] || [];
              setUnits(domainUnits);
            } else if (Array.isArray(data)) {
              setUnits(data);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch knowledge:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchKnowledge();
  }, [isExpanded, domain, knowledgeUnitId, initialLinks]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  if (!domain && !knowledgeUnitId && initialLinks.length === 0) return null;

  const isTutorMode = mode === 'tutor';

  async function sendMessage() {
    if (!inputValue.trim() || chatLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    const newTurn: ConversationTurn = { role: 'user', content: userMessage };
    const updatedHistory = [...conversation, newTurn];
    setConversation(updatedHistory);
    setChatLoading(true);

    try {
      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId: stepId || '',
          message: userMessage,
          knowledgeUnitId,
          conversationHistory: conversation,
        }),
      });

      const data = await res.json();
      const assistantTurn: ConversationTurn = {
        role: 'assistant',
        content: data.response || 'I couldn\'t generate a response right now.',
      };

      setConversation([...updatedHistory, assistantTurn]);

      if (data.masterySignal) {
        setMasterySignal(data.masterySignal);
      }
    } catch (err) {
      console.error('Tutor chat failed:', err);
      setConversation([
        ...updatedHistory,
        { role: 'assistant', content: 'AI tutor is currently unavailable. Please try again later.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const headerIcon = isTutorMode ? '🧑‍🏫' : '📖';
  const headerLabel = isTutorMode ? 'Ask the Tutor' : (COPY.knowledge.actions.learnMore as string);

  return (
    <div className="mt-8 border border-[#1e1e2e] rounded-lg bg-[#0f0f17] overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1e1e2e]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{headerIcon}</span>
          <span className="text-sm font-medium text-slate-300">{headerLabel}</span>
          {domain && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {domain}
            </span>
          )}
          {isTutorMode && masterySignal && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${getMasterySignalStyle(masterySignal)}`}>
              {masterySignal}
            </span>
          )}
        </div>
        <span className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          ↓
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-[#1e1e2e] bg-[#0c0c12]">
          {/* Read mode: knowledge unit list */}
          <div className="p-4">
            {loading ? (
              <div className="py-4 text-center text-sm text-slate-500 animate-pulse">
                {COPY.common.loading}
              </div>
            ) : units.length > 0 ? (
              <div className={`space-y-3 ${units.length > 2 ? 'max-h-[320px] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
                {units.length === 1 ? (
                  // Single unit: keep current rendering
                  <div className="group">
                    <h4 className="text-sm font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                      {units[0].title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {units[0].thesis}
                    </p>
                    <Link
                      href={`/knowledge/${units[0].id}`}
                      className="text-xs text-blue-400/80 hover:text-blue-400 mt-2 inline-block font-medium"
                    >
                      Read full →
                    </Link>
                  </div>
                ) : (
                  // Multiple units: compact list
                  units.map((unit) => (
                    <div key={unit.id} className="p-3 border border-[#1e1e2e] rounded-lg bg-[#0d0d18] hover:border-blue-500/30 transition-all group shadow-sm">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <h4 className="text-sm font-semibold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-2">
                          {unit.title}
                        </h4>
                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-tight border ${getTypeColor(unit.unit_type)} flex-shrink-0`}>
                          {COPY.knowledge.unitTypes[unit.unit_type as keyof typeof COPY.knowledge.unitTypes]}
                        </div>
                      </div>
                      <Link
                        href={`/knowledge/${unit.id}`}
                        className="text-[10px] font-bold uppercase tracking-widest text-blue-400/80 hover:text-blue-400 transition-colors"
                      >
                        Read &rarr;
                      </Link>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-slate-500">
                No specific units found for this domain yet.
              </div>
            )}
          </div>

          {/* TutorChat mode: conversation panel */}
          {isTutorMode && (
            <div className="border-t border-[#1e1e2e]">
              {/* Chat history */}
              <div className="max-h-64 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {conversation.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center italic">
                    Ask a question about this topic — the tutor is context-aware.
                  </p>
                ) : (
                  conversation.map((turn, i) => (
                    <div
                      key={i}
                      className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                          turn.role === 'user'
                            ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30'
                            : 'bg-[#1e1e2e] text-slate-200 border border-[#2a2a3e]'
                        }`}
                      >
                        {turn.role === 'assistant' && (
                          <span className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-widest block mb-1">
                            Tutor
                          </span>
                        )}
                        {turn.content}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[#1e1e2e] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs text-slate-500 animate-pulse">
                      Thinking…
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input area */}
              <div className="p-3 border-t border-[#1e1e2e] flex gap-2 items-end">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about this topic… (Enter to send)"
                  rows={2}
                  className="flex-1 bg-[#1e1e2e] text-slate-200 text-xs rounded-lg px-3 py-2 resize-none border border-[#2a2a3e] focus:outline-none focus:border-amber-500/50 placeholder:text-slate-600 transition-colors"
                  disabled={chatLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={chatLoading || !inputValue.trim()}
                  className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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

const getMasterySignalStyle = (signal: 'struggling' | 'progressing' | 'confident') => {
  switch (signal) {
    case 'struggling':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'progressing':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'confident':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  }
};

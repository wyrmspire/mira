// types/agent-memory.ts
// Sprint 24 — Agent Memory: GPT's persistent, correctable notebook

/**
 * The cognitive function of a memory entry.
 * Each kind maps to a different type of thought GPT records.
 */
export type MemoryEntryKind =
  | 'observation'   // Something GPT noticed about the user or context
  | 'strategy'      // A high-level approach or workflow pattern
  | 'idea'          // A creative thought or possibility
  | 'preference'    // A user preference GPT should remember
  | 'tactic'        // A concrete, repeatable technique
  | 'assessment'    // An evaluation or judgment about progress/quality
  | 'note';         // General-purpose note that doesn't fit other kinds

/**
 * How the memory should be recalled — orthogonal to kind.
 * kind = what type of note, class = how to recall it.
 */
export type MemoryClass = 'semantic' | 'episodic' | 'procedural';

/**
 * A single memory entry in GPT's notebook.
 * Entries persist across sessions, can be corrected by users,
 * and are boosted on reuse (never auto-deleted).
 */
export interface AgentMemoryEntry {
  id: string;
  userId: string;
  kind: MemoryEntryKind;
  memoryClass: MemoryClass;
  topic: string;
  content: string;
  tags: string[];
  confidence: number;             // 0.0–1.0, boosted on reuse
  usageCount: number;
  pinned: boolean;                // User/admin protection from decay
  source: 'gpt_learned' | 'admin_seeded';
  createdAt: string;
  lastUsedAt: string;
  metadata: Record<string, unknown>;
}

/**
 * Packet shape for returning memory entries in bulk.
 * Used by the Memory Explorer and API list responses.
 */
export interface AgentMemoryPacket {
  entries: AgentMemoryEntry[];
  totalCount: number;
  lastRecordedAt: string | null;
}

// ---------------------------------------------------------------------------
// State Packet — Lock 1 Contract
// ---------------------------------------------------------------------------

/**
 * Board summary nested inside the operational context.
 * Lightweight: ID + name + purpose + node count only.
 */
export interface OperationalContextBoardSummary {
  id: string;
  name: string;
  purpose: string;
  nodeCount: number;
}

/**
 * Canonical shape for the `operational_context` field in the GPT state packet.
 *
 * Lock 1 contract:
 * - Contains memory handles (IDs + counts, NOT full entries)
 * - Contains board summaries (lightweight)
 * - The entire field is `null` if there are 0 memories AND 0 boards
 * - Additive: this field is added alongside existing state packet fields
 *
 * GPT uses this to decide whether to fetch full memory entries via
 * `GET /api/gpt/memory?topic=X&kind=Y` — it never receives full content inline.
 */
export interface OperationalContext {
  /** Total number of memory entries for the user. */
  memory_count: number;
  /** Top 10 memory IDs, pinned-first then by usage DESC. IDs only, not full entries. */
  recent_memory_ids: string[];
  /** ISO timestamp of the most recently recorded memory, or null if none. */
  last_recorded_at: string | null;
  /** Distinct topic strings across all memory entries. */
  active_topics: string[];
  /** Lightweight board summaries for active (non-archived) boards. */
  boards: OperationalContextBoardSummary[];
}

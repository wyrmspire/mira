// lib/services/agent-memory-service.ts
import { AgentMemoryEntry, OperationalContext, MemoryEntryKind, MemoryClass } from '@/types/agent-memory';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { generateId } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * Normalizes a DB row (snake_case) to the TS AgentMemoryEntry shape (camelCase).
 */
function fromDB(row: any): AgentMemoryEntry {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    memoryClass: row.memory_class,
    topic: row.topic,
    content: row.content,
    tags: row.tags || [],
    confidence: Number(row.confidence),
    usageCount: row.usage_count,
    pinned: row.pinned,
    source: row.source,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    metadata: row.metadata || {},
  };
}

/**
 * Normalizes a TS AgentMemoryEntry (camelCase) to DB row shape (snake_case).
 */
function toDB(memory: Partial<AgentMemoryEntry>): Record<string, any> {
  const row: Record<string, any> = {};
  if (memory.id) row.id = memory.id;
  if (memory.userId) row.user_id = memory.userId;
  if (memory.kind) row.kind = memory.kind;
  if (memory.memoryClass) row.memory_class = memory.memoryClass;
  if (memory.topic) row.topic = memory.topic;
  if (memory.content) row.content = memory.content;
  if (memory.tags) row.tags = memory.tags;
  if (memory.confidence !== undefined) row.confidence = memory.confidence;
  if (memory.usageCount !== undefined) row.usage_count = memory.usageCount;
  if (memory.pinned !== undefined) row.pinned = memory.pinned;
  if (memory.source) row.source = memory.source;
  if (memory.createdAt) row.created_at = memory.createdAt;
  if (memory.lastUsedAt) row.last_used_at = memory.lastUsedAt;
  if (memory.metadata) row.metadata = memory.metadata;
  return row;
}

/**
 * Records a new memory or boosts an existing one if matches precisely (user, topic, kind, content).
 * Lock 2: Deduplication on (user_id, topic, kind, content).
 */
export async function recordMemory(
  params: {
    userId: string;
    kind: MemoryEntryKind;
    topic: string;
    content: string;
    memoryClass?: MemoryClass;
    tags?: string[];
    metadata?: Record<string, any>;
    source?: 'gpt_learned' | 'admin_seeded';
    confidence?: number;
    pinned?: boolean;
  }
): Promise<AgentMemoryEntry> {
  const adapter = getStorageAdapter();
  const supabase = getSupabaseClient();

  if (!supabase) {
    const existing = await adapter.query<any>('agent_memory', {
      user_id: params.userId,
      topic: params.topic,
      kind: params.kind,
      content: params.content,
    });

    if (existing.length > 0) {
      const match = existing[0];
      const updates = {
        usage_count: (match.usage_count || 0) + 1,
        confidence: Math.min(1.0, (Number(match.confidence) || 0) + 0.05),
        last_used_at: new Date().toISOString(),
      };
      const updated = await adapter.updateItem<any>('agent_memory', match.id, updates);
      return fromDB(updated);
    }

    const newItem = toDB({
      id: generateId(),
      userId: params.userId,
      kind: params.kind,
      topic: params.topic,
      content: params.content,
      memoryClass: params.memoryClass || 'semantic',
      tags: params.tags || [],
      confidence: params.confidence || 0.6,
      usageCount: 1,
      pinned: params.pinned || false,
      source: params.source || 'gpt_learned',
      metadata: params.metadata || {},
    });
    const saved = await adapter.saveItem<any>('agent_memory', newItem);
    return fromDB(saved);
  }

  const { data: match, error: fetchError } = await supabase
    .from('agent_memory')
    .select('*')
    .eq('user_id', params.userId)
    .eq('topic', params.topic)
    .eq('kind', params.kind)
    .eq('content', params.content)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (match) {
    const { data: updated, error: updateError } = await supabase
      .from('agent_memory')
      .update({
        usage_count: (match.usage_count || 0) + 1,
        confidence: Math.min(1.0, (Number(match.confidence) || 0) + 0.05),
        last_used_at: new Date().toISOString(),
      })
      .eq('id', match.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return fromDB(updated);
  }

  const newItem = toDB({
    id: generateId(),
    userId: params.userId,
    kind: params.kind,
    topic: params.topic,
    content: params.content,
    memoryClass: params.memoryClass || 'semantic',
    tags: params.tags || [],
    confidence: params.confidence || 0.6,
    usageCount: 1,
    pinned: params.pinned || false,
    source: params.source || 'gpt_learned',
    metadata: params.metadata || {},
  });

  const { data: saved, error: saveError } = await supabase
    .from('agent_memory')
    .insert(newItem)
    .select()
    .single();

  if (saveError) throw saveError;
  return fromDB(saved);
}

/**
 * Retrieves memories for a user with optional filters.
 */
export async function getMemories(
  userId: string,
  filters?: {
    topic?: string;
    kind?: MemoryEntryKind;
    source?: string;
    pinned?: boolean;
    limit?: number;
  }
): Promise<AgentMemoryEntry[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const adapter = getStorageAdapter();
    const queryParams: Record<string, any> = { user_id: userId };
    if (filters?.topic) queryParams.topic = filters.topic;
    if (filters?.kind) queryParams.kind = filters.kind;
    if (filters?.pinned !== undefined) queryParams.pinned = filters.pinned;
    
    const raw = await adapter.query<any>('agent_memory', queryParams);
    return raw.map(fromDB);
  }

  let query = supabase
    .from('agent_memory')
    .select('*')
    .eq('user_id', userId);

  if (filters?.topic) query = query.eq('topic', filters.topic);
  if (filters?.kind) query = query.eq('kind', filters.kind);
  if (filters?.pinned !== undefined) query = query.eq('pinned', filters.pinned);
  
  query = query.order('pinned', { ascending: false })
               .order('usage_count', { ascending: false })
               .order('last_used_at', { ascending: false });

  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data.map(fromDB);
}

/**
 * Gets a single memory by ID.
 */
export async function getMemoryById(id: string): Promise<AgentMemoryEntry | null> {
  const adapter = getStorageAdapter();
  const raw = await adapter.query<any>('agent_memory', { id });
  return raw.length > 0 ? fromDB(raw[0]) : null;
}

/**
 * Updates a memory entry (correction path).
 */
export async function updateMemory(id: string, updates: Partial<AgentMemoryEntry>): Promise<AgentMemoryEntry> {
  const adapter = getStorageAdapter();
  const updated = await adapter.updateItem<any>('agent_memory', id, toDB(updates));
  return fromDB(updated);
}

/**
 * Deletes a memory entry.
 */
export async function deleteMemory(id: string): Promise<void> {
  const adapter = getStorageAdapter();
  await adapter.deleteItem('agent_memory', id);
}

/**
 * Assembles the operational context for the GPT state packet.
 * Lock 1: Lightweight handle-based context.
 */
export async function getOperationalContext(userId: string): Promise<OperationalContext | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const [memoryStats, recentMemories, topics, boards] = await Promise.all([
    supabase.from('agent_memory').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('agent_memory')
      .select('id')
      .eq('user_id', userId)
      .order('pinned', { ascending: false })
      .order('usage_count', { ascending: false })
      .limit(10),
    supabase.from('agent_memory').select('topic').eq('user_id', userId).order('last_used_at', { ascending: false }).limit(100),
    supabase.from('think_boards')
      .select('id, name, purpose')
      .eq('is_archived', false)
      .limit(20)
  ]);

  const activeTopics = Array.from(new Set((topics.data || []).map((t: any) => t.topic))).slice(0, 5);

  const { data: nodeCounts } = await supabase
    .from('think_nodes')
    .select('board_id')
    .in('board_id', (boards.data || []).map(b => b.id));

  const countMap = (nodeCounts || []).reduce((acc: any, n) => {
    acc[n.board_id] = (acc[n.board_id] || 0) + 1;
    return acc;
  }, {});

  const boardSummaries = (boards.data || []).map(b => ({
    id: b.id,
    name: b.name,
    purpose: b.purpose,
    nodeCount: countMap[b.id] || 0
  }));

  const { data: lastRec } = await supabase
    .from('agent_memory')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if ((memoryStats.count || 0) === 0 && boardSummaries.length === 0) return null;

  return {
    memory_count: memoryStats.count || 0,
    recent_memory_ids: (recentMemories.data || []).map((m: any) => m.id),
    last_recorded_at: lastRec?.created_at || null,
    active_topics: activeTopics,
    boards: boardSummaries
  };
}

/**
 * W3: Automated Consolidation (Lock 3)
 */
export async function consolidateMemory(userId: string, lookbackHours: number = 24): Promise<{ extractedCount: number, message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { extractedCount: 0, message: "Consolidation requires a live database connection." };
  }

  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

  // 1. Fetch recently completed experiences
  const { data: experiences } = await supabase
    .from('experience_instances')
    .select('id, title, goal, synthesis')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('updated_at', since);

  let extractedCount = 0;

  if (experiences && experiences.length > 0) {
    for (const exp of experiences) {
      if (exp.synthesis) {
        await recordMemory({
          userId,
          kind: 'observation',
          topic: exp.title,
          content: `Completed experience "${exp.title}". Key takeaway: ${exp.synthesis.substring(0, 200)}...`,
          source: 'gpt_learned',
          metadata: { experienceId: exp.id, auto_extracted: true }
        });
        extractedCount++;
      }
    }
  }

  // 2. Fetch recent high-friction interactions
  const { data: interactions } = await supabase
    .from('interactions')
    .select('id, event_type, payload')
    .eq('user_id', userId)
    .gte('created_at', since)
    .gt('friction_score', 0.7);

  if (interactions && interactions.length > 0) {
    for (const intr of interactions) {
      if (intr.payload?.content) {
        await recordMemory({
          userId,
          kind: 'strategy',
          topic: 'Learning Friction',
          content: `Encountered friction in ${intr.event_type}. Note: ${intr.payload.content.substring(0, 100)}`,
          source: 'gpt_learned',
          metadata: { interactionId: intr.id, auto_extracted: true }
        });
        extractedCount++;
      }
    }
  }

  if (extractedCount === 0) {
    return { extractedCount: 0, message: `No actionable memories found in the last ${lookbackHours} hours.` };
  }

  return { 
    extractedCount, 
    message: `Successfully consolidated ${extractedCount} new memories from recent activity.` 
  };
}

/**
 * Groups memories by topic for Explorer view (Lane 5).
 */
export async function getMemoriesGroupedByTopic(userId: string): Promise<Record<string, AgentMemoryEntry[]>> {
  const memories = await getMemories(userId);
  return memories.reduce((acc: Record<string, AgentMemoryEntry[]>, memory) => {
    const topic = memory.topic || 'General';
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push(memory);
    return acc;
  }, {});
}

/**
 * W4: Seed default memory entries (Frozen list per sprint.md)
 */
export async function seedDefaultMemory(userId: string): Promise<void> {
  const defaultMemories = [
    {
      kind: 'tactic' as const,
      topic: 'curriculum',
      content: 'Use create_outline before creating experiences for serious topics',
      confidence: 0.9,
      pinned: true
    },
    {
      kind: 'tactic' as const,
      topic: 'enrichment',
      content: 'Check enrichment status in the state packet before creating new experiences on the same topic',
      confidence: 0.9,
      pinned: true
    },
    {
      kind: 'strategy' as const,
      topic: 'workflow',
      content: 'For new domains: goal → outline → research dispatch → experience creation (not experience first)',
      confidence: 0.9,
      pinned: true
    },
    {
      kind: 'observation' as const,
      topic: 'pedagogy',
      content: 'Checkpoint questions with free_text format produce stronger learning outcomes than multiple choice',
      confidence: 0.85
    },
    {
      kind: 'tactic' as const,
      topic: 'maps',
      content: 'Use board_from_text or expand_board_branch instead of creating nodes one at a time',
      confidence: 0.85
    },
    {
      kind: 'preference' as const,
      topic: 'user learning style',
      content: 'User prefers worked examples and concrete scenarios over abstract explanations',
      confidence: 0.8
    },
    {
      kind: 'strategy' as const,
      topic: 'experience design',
      content: 'Keep experiences to 3-6 steps covering one subtopic. Chain small experiences rather than building monoliths.',
      confidence: 0.9,
      pinned: true
    }
  ];

  for (const mem of defaultMemories) {
    try {
      await recordMemory({
        ...mem,
        userId,
        source: 'admin_seeded'
      });
    } catch (e) {
      console.warn(`Failed to seed memory: ${mem.topic}`, e);
    }
  }
}

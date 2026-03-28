// lib/services/step-knowledge-link-service.ts
import { StepKnowledgeLink, StepKnowledgeLinkRow } from '@/types/curriculum';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { generateId } from '@/lib/utils';
import { StepKnowledgeLinkType } from '@/lib/constants';

/**
 * Normalization from DB to TS
 */
function fromDB(row: StepKnowledgeLinkRow): StepKnowledgeLink {
  return {
    id: row.id,
    stepId: row.step_id,
    knowledgeUnitId: row.knowledge_unit_id,
    linkType: row.link_type,
    createdAt: row.created_at,
  };
}

/**
 * Persists a link between an experience step and a knowledge unit.
 */
export async function linkStepToKnowledge(
  stepId: string, 
  knowledgeUnitId: string, 
  linkType: StepKnowledgeLinkType = 'teaches'
): Promise<StepKnowledgeLink> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  
  const row: StepKnowledgeLinkRow = {
    id: generateId(),
    step_id: stepId,
    knowledge_unit_id: knowledgeUnitId,
    link_type: linkType,
    created_at: now,
  };

  const saved = await adapter.saveItem<StepKnowledgeLinkRow>('step_knowledge_links', row);
  return fromDB(saved);
}

/**
 * Fetches all knowledge links for a specific experience step.
 */
export async function getLinksForStep(stepId: string): Promise<StepKnowledgeLink[]> {
  const adapter = getStorageAdapter();
  // Ensure we use the correct snake_case column in the query
  const rows = await adapter.query<StepKnowledgeLinkRow>('step_knowledge_links', { step_id: stepId });
  return rows.map(fromDB);
}

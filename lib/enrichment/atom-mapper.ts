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

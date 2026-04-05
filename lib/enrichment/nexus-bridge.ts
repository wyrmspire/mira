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
